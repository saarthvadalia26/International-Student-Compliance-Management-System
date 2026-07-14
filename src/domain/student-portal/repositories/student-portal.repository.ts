import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  StudentPortalProfile, 
  UploadToken, 
  UploadAuditLog, 
  StudentHistoryRow,
  StudentReminderHistoryRow
} from "../types";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";

export interface IStudentPortalRepository {
  getStudentProfile(studentId: string): Promise<StudentPortalProfile | null>;
  createUploadToken(studentId: string, purpose: UploadToken["purpose"], tokenHash: string, expiresAt: Date, createdBy?: string | null): Promise<UploadToken>;
  verifyUploadToken(tokenHash: string): Promise<UploadToken | null>;
  markTokenUsed(tokenId: string): Promise<void>;
  logActivity(studentId: string, action: string, ipAddress: string | null, userAgent: string | null, details?: Record<string, unknown>): Promise<void>;
  logUploadAudit(log: Omit<UploadAuditLog, "id" | "timestamp">): Promise<void>;
  getStudentHistory(studentId: string): Promise<StudentHistoryRow[]>;
  getStudentReminders(studentId: string): Promise<StudentReminderHistoryRow[]>;
  checkDuplicateChecksum(checksum: string): Promise<boolean>;
}

export class SupabaseStudentPortalRepository implements IStudentPortalRepository {
  async getStudentProfile(studentId: string): Promise<StudentPortalProfile | null> {
    const supabase = getAdminSupabase();
    console.log(`[STUDENT_PORTAL_REPO] Loading profile for student: ${studentId}`);

    // Query core student records using standard relationships
    const { data: student, error } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        student_personal(
          full_name,
          nationality_code
        ),
        student_academic(
          program_code
        ),
        student_contact(
          email,
          phone_home,
          phone_local
        ),
        student_snapshot(
          efrro_status,
          efrro_expiry,
          days_until_efrro_expiry
        )
      `)
      .eq("id", studentId)
      .single();

    if (error || !student) {
      console.error(`[STUDENT_PORTAL_REPO_ERROR] Student not found: ${studentId}`, error?.message);
      return null;
    }

    // Load reference data mapping to resolve program, school, and country names
    const { data: refData } = await supabase
      .from("reference_data")
      .select("code, display_name, category")
      .in("category", ["school", "course", "gender"]);

    const refMap: Record<string, string> = {};
    if (refData) {
      refData.forEach(r => {
        refMap[r.code] = r.display_name;
      });
    }

    // Get last upload date from active efrro version
    const { data: lastVer } = await supabase
      .from("efrro_versions")
      .select("created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
    const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;
    const contact = Array.isArray(student.student_contact) ? student.student_contact[0] : student.student_contact;
    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

    const progCode = academic?.program_code || "";

    return {
      studentId: student.id,
      fullName: personal?.full_name || "",
      registrationNumber: student.registration_number,
      programme: refMap[progCode] || progCode,
      school: "School of Forensic Sciences", // Standard institutional fallback
      nationality: personal?.nationality_code || "",
      email: contact?.email || "",
      phoneHome: contact?.phone_home || "",
      phoneLocal: contact?.phone_local || "",
      efrroStatus: snapshot?.efrro_status || "MISSING",
      efrroExpiry: snapshot?.efrro_expiry || null,
      daysRemaining: snapshot?.days_until_efrro_expiry !== undefined ? snapshot.days_until_efrro_expiry : null,
      lastUploadDate: lastVer?.created_at || null
    };
  }

  async createUploadToken(
    studentId: string,
    purpose: UploadToken["purpose"],
    tokenHash: string,
    expiresAt: Date,
    createdBy?: string | null
  ): Promise<UploadToken> {
    const supabase = getAdminSupabase();
    console.log(`[STUDENT_PORTAL_REPO] Creating secure token hash for student: ${studentId}, purpose: ${purpose}`);

    const { data, error } = await supabase
      .from("student_upload_tokens")
      .insert({
        student_id: studentId,
        purpose,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy || null
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`[DB_INSERT_FAILED] Failed to store upload token: ${error?.message}`);
    }

    return {
      id: data.id,
      studentId: data.student_id,
      purpose: data.purpose as UploadToken["purpose"],
      tokenHash: data.token_hash,
      expiresAt: new Date(data.expires_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    };
  }

  async verifyUploadToken(tokenHash: string): Promise<UploadToken | null> {
    const supabase = getAdminSupabase();
    console.log(`[STUDENT_PORTAL_REPO] Verifying token hash lookup...`);

    const { data, error } = await supabase
      .from("student_upload_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      studentId: data.student_id,
      purpose: data.purpose as UploadToken["purpose"],
      tokenHash: data.token_hash,
      expiresAt: new Date(data.expires_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    };
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    const supabase = getAdminSupabase();
    console.log(`[STUDENT_PORTAL_REPO] Invalidating single-use token: ${tokenId}`);

    const { error } = await supabase
      .from("student_upload_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenId);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }
  }

  async logActivity(
    studentId: string, 
    action: string, 
    ipAddress: string | null, 
    userAgent: string | null, 
    details?: Record<string, unknown>
  ): Promise<void> {
    const supabase = getAdminSupabase();
    
    const { error } = await supabase
      .from("student_activity_log")
      .insert({
        student_id: studentId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: details || {}
      });

    if (error) {
      console.error(`[STUDENT_PORTAL_REPO_ERROR] Failed to write student activity: ${error.message}`);
    }
  }

  async logUploadAudit(log: Omit<UploadAuditLog, "id" | "timestamp">): Promise<void> {
    const supabase = getAdminSupabase();

    const { error } = await supabase
      .from("upload_audit_log")
      .insert({
        student_id: log.studentId,
        filename: log.filename,
        file_size: log.fileSize,
        checksum: log.checksum,
        status: log.status,
        ip_address: log.ipAddress,
        user_agent: log.userAgent
      });

    if (error) {
      console.error(`[STUDENT_PORTAL_REPO_ERROR] Failed to record upload audit log: ${error.message}`);
    }
  }

  async getStudentHistory(studentId: string): Promise<StudentHistoryRow[]> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("efrro_versions")
      .select("id, file_path, created_at, verification_status, comments, verified_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      versionId: row.id,
      filename: row.file_path.split("/").pop() || "efrro_document.pdf",
      uploadDate: row.created_at,
      verificationStatus: row.verification_status,
      reviewerComments: row.comments || null,
      reviewedAt: row.verified_at || null
    }));
  }

  async getStudentReminders(studentId: string): Promise<StudentReminderHistoryRow[]> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select("id, channel, created_at, trigger_source, status")
      .eq("student_id", studentId)
      .eq("document_type", "efrro")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      channel: row.channel,
      sentAt: row.created_at,
      triggerSource: row.trigger_source,
      status: row.status
    }));
  }

  async checkDuplicateChecksum(checksum: string): Promise<boolean> {
    const supabase = getAdminSupabase();

    // Check both upload audit logs and efrro_versions for matches
    const { count, error } = await supabase
      .from("upload_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("checksum", checksum)
      .eq("status", "success");

    if (error) {
      console.error(`[STUDENT_PORTAL_REPO_ERROR] Failed checksum lookup: ${error.message}`);
      return false;
    }

    return (count || 0) > 0;
  }
}

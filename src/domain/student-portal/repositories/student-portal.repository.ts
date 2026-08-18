import { getAdminSupabase } from "@/lib/supabase/admin";
import { 
  StudentPortalProfile, 
  UploadToken, 
  UploadAuditLog, 
  StudentHistoryRow,
  StudentReminderHistoryRow
} from "../types";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";
import { getCountryByCode } from "@/utils/countries";

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
          passport_number,
          passport_expiry,
          visa_number,
          visa_type,
          visa_expiry,
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

    // Load reference data mapping to resolve program and school
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

    // Load latest Passport document version
    const { data: passportVer } = await supabase
      .from("passport_versions")
      .select("id, document_number, expiry_date, verification_status, notes, rejection_reason, created_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load latest Visa document version
    const { data: visaVer } = await supabase
      .from("visa_versions")
      .select("id, document_number, visa_type, expiry_date, verification_status, notes, rejection_reason, created_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load latest eFRRO document version
    const { data: efrroVer } = await supabase
      .from("efrro_versions")
      .select("id, created_at, verification_status, notes, rejection_reason")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
    const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;
    const contact = Array.isArray(student.student_contact) ? student.student_contact[0] : student.student_contact;
    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

    const progCode = academic?.program_code || "";

    // Resolve Passport status
    const passportStatus: StudentPortalProfile["passportStatus"] = passportVer
      ? (passportVer.verification_status === "APPROVED" ? "APPROVED" : passportVer.verification_status === "REJECTED" ? "REJECTED" : "PENDING_VERIFICATION")
      : "NOT_SUBMITTED";

    // Resolve Visa status
    const visaStatus: StudentPortalProfile["visaStatus"] = visaVer
      ? (visaVer.verification_status === "APPROVED" ? "APPROVED" : visaVer.verification_status === "REJECTED" ? "REJECTED" : "PENDING_VERIFICATION")
      : "NOT_SUBMITTED";

    // Resolve eFRRO status
    const rawEfrro = snapshot?.efrro_status || (efrroVer ? efrroVer.verification_status : "NOT_SUBMITTED");
    const efrroStatus: StudentPortalProfile["efrroStatus"] = 
      rawEfrro === "APPROVED" || rawEfrro === "COMPLIANT" ? "COMPLIANT" :
      rawEfrro === "WARNING" || rawEfrro === "EXPIRING_SOON" ? "WARNING" :
      rawEfrro === "EXPIRED" ? "EXPIRED" :
      rawEfrro === "REJECTED" ? "REJECTED" :
      rawEfrro === "PENDING_VERIFICATION" || rawEfrro === "PENDING" ? "PENDING_VERIFICATION" : "NOT_SUBMITTED";

    // Overall compliance
    const isOverallCompliant = passportStatus === "APPROVED" && visaStatus === "APPROVED" && (efrroStatus === "COMPLIANT" || efrroStatus === "WARNING");
    const overallCompliance: StudentPortalProfile["overallCompliance"] = isOverallCompliant ? "COMPLIANT" : "ATTENTION_REQUIRED";

    const lastUpload = [passportVer?.created_at, visaVer?.created_at, efrroVer?.created_at]
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

    const today = new Date().toISOString().split("T")[0];
    const passExp = passportVer?.expiry_date || snapshot?.passport_expiry || null;
    const visaExp = visaVer?.expiry_date || snapshot?.visa_expiry || null;
    const efrroExp = snapshot?.efrro_expiry || null;

    const passportDaysRemaining = passExp ? Math.round((new Date(passExp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const visaDaysRemaining = visaExp ? Math.round((new Date(visaExp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const efrroDaysRemaining = efrroExp ? Math.round((new Date(efrroExp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : (snapshot?.days_until_efrro_expiry !== undefined ? snapshot.days_until_efrro_expiry : null);

    const natCode = personal?.nationality_code || "";
    const countryName = natCode ? (getCountryByCode(natCode)?.name || natCode) : "";

    return {
      studentId: student.id,
      fullName: personal?.full_name || "",
      registrationNumber: student.registration_number,
      programme: refMap[progCode] || progCode || "Not assigned yet",
      school: "School of Forensic Sciences",
      nationality: countryName || "Not specified",
      email: contact?.email || "",
      phoneHome: contact?.phone_home || "",
      phoneLocal: contact?.phone_local || "",

      overallCompliance,

      passportNumber: passportVer?.document_number || snapshot?.passport_number || null,
      passportExpiry: passExp,
      passportDaysRemaining,
      passportStatus,
      passportRemarks: passportVer?.rejection_reason || passportVer?.notes || null,
      passportUploadDate: passportVer?.created_at || null,

      visaNumber: visaVer?.document_number || snapshot?.visa_number || null,
      visaType: visaVer?.visa_type || snapshot?.visa_type || null,
      visaExpiry: visaExp,
      visaDaysRemaining,
      visaStatus,
      visaRemarks: visaVer?.rejection_reason || visaVer?.notes || null,
      visaUploadDate: visaVer?.created_at || null,

      efrroStatus,
      efrroExpiry: efrroExp,
      efrroRemarks: efrroVer?.rejection_reason || efrroVer?.notes || null,
      efrroUploadDate: efrroVer?.created_at || null,
      daysRemaining: efrroDaysRemaining,
      efrroDaysRemaining,

      passportEligibility: await (async () => {
        const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");
        return DocumentUploadEligibilityEngine.evaluateEligibility(student.id, "passport");
      })().catch(() => undefined),

      visaEligibility: await (async () => {
        const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");
        return DocumentUploadEligibilityEngine.evaluateEligibility(student.id, "visa");
      })().catch(() => undefined),

      efrroEligibility: await (async () => {
        const { DocumentUploadEligibilityEngine } = await import("@/domain/compliance/services/upload-eligibility.service");
        return DocumentUploadEligibilityEngine.evaluateEligibility(student.id, "efrro");
      })().catch(() => undefined),

      lastUploadDate: lastUpload
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
      console.error(`[STUDENT_PORTAL_REPO_ERROR] Failed to write activity: ${error.message}`);
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

    const [efrroRes, passportRes, visaRes] = await Promise.all([
      supabase
        .from("efrro_versions")
        .select("id, file_path, created_at, verification_status, notes, rejection_reason, verified_at")
        .eq("student_id", studentId)
        .is("deleted_at", null),
      supabase
        .from("passport_versions")
        .select("id, file_path, created_at, verification_status, notes, rejection_reason, verified_at")
        .eq("student_id", studentId)
        .is("deleted_at", null),
      supabase
        .from("visa_versions")
        .select("id, file_path, created_at, verification_status, notes, rejection_reason, verified_at")
        .eq("student_id", studentId)
        .is("deleted_at", null)
    ]);

    const history: StudentHistoryRow[] = [];

    if (efrroRes.data) {
      efrroRes.data.forEach(row => {
        history.push({
          versionId: row.id,
          documentType: "efrro",
          filename: row.file_path.split("/").pop() || "efrro_document.pdf",
          uploadDate: row.created_at,
          verificationStatus: row.verification_status,
          reviewerComments: row.rejection_reason || row.notes || null,
          reviewedAt: row.verified_at || null
        });
      });
    }

    if (passportRes.data) {
      passportRes.data.forEach(row => {
        history.push({
          versionId: row.id,
          documentType: "passport",
          filename: row.file_path.split("/").pop() || "passport_document.pdf",
          uploadDate: row.created_at,
          verificationStatus: row.verification_status,
          reviewerComments: row.rejection_reason || row.notes || null,
          reviewedAt: row.verified_at || null
        });
      });
    }

    if (visaRes.data) {
      visaRes.data.forEach(row => {
        history.push({
          versionId: row.id,
          documentType: "visa",
          filename: row.file_path.split("/").pop() || "visa_document.pdf",
          uploadDate: row.created_at,
          verificationStatus: row.verification_status,
          reviewerComments: row.rejection_reason || row.notes || null,
          reviewedAt: row.verified_at || null
        });
      });
    }

    return history.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getStudentReminders(studentId: string): Promise<StudentReminderHistoryRow[]> {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select("id, document_type, channel, created_at, trigger_source, status, notification_context")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      documentType: row.document_type as "passport" | "visa" | "efrro",
      channel: row.channel,
      sentAt: row.created_at,
      triggerSource: row.trigger_source,
      status: row.status,
      details: row.notification_context || {}
    }));
  }

  async checkDuplicateChecksum(checksum: string): Promise<boolean> {
    const supabase = getAdminSupabase();

    const { count, error } = await supabase
      .from("upload_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("checksum", checksum)
      .eq("status", "success");

    if (error) {
      return false;
    }

    return (count || 0) > 0;
  }
}

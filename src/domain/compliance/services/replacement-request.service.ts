/**
 * Domain Service: Document Replacement Request Service
 *
 * Implements the state machine, business rules, duplicate request prevention,
 * staff authorization generation, and completion tracking for student early
 * document replacement requests.
 */

export * from "../types/replacement-request.types";
import { 
  DocumentReplacementReason, 
  DocumentReplacementStatus, 
  DocumentReplacementRequestRecord,
  SubmitReplacementRequestInput,
  ApproveReplacementRequestInput,
  RejectReplacementRequestInput,
  REASON_LABELS
} from "../types/replacement-request.types";

export class DocumentReplacementRequestService {
  /**
   * Helper to format reason into readable string
   */
  static formatReason(reason: DocumentReplacementReason): string {
    return REASON_LABELS[reason] || reason;
  }

  /**
   * Pure State Machine Validator: determines if transition from current to target status is valid
   */
  static isValidStatusTransition(
    currentStatus: DocumentReplacementStatus,
    targetStatus: DocumentReplacementStatus
  ): boolean {
    const validTransitions: Record<DocumentReplacementStatus, DocumentReplacementStatus[]> = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["completed", "expired"],
      rejected: [], // terminal
      cancelled: [], // terminal
      expired: [], // terminal
      completed: [] // terminal
    };

    return (validTransitions[currentStatus] || []).includes(targetStatus);
  }

  /**
   * Pure evaluation: Determines if an approved request has expired
   */
  static isRequestExpired(
    request: Pick<DocumentReplacementRequestRecord, "status" | "authorizationExpiresAt">,
    currentDate: Date = new Date()
  ): boolean {
    if (request.status !== "approved" || !request.authorizationExpiresAt) {
      return false;
    }
    const expiry = new Date(request.authorizationExpiresAt);
    return currentDate.getTime() > expiry.getTime();
  }

  /**
   * Database: Submit a new document replacement request
   */
  static async submitRequest(
    studentId: string,
    input: SubmitReplacementRequestInput
  ): Promise<{ success: boolean; request?: DocumentReplacementRequestRecord; error?: string }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    if (!input.reasonDetails || !input.reasonDetails.trim()) {
      return { success: false, error: "Detailed explanation is mandatory when submitting an early replacement request." };
    }

    if (input.reason === "other" && input.reasonDetails.trim().length < 5) {
      return { success: false, error: "Please provide a specific explanation when selecting 'Other' as the replacement reason." };
    }

    // 1. Verify student exists
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id, status")
      .eq("id", studentId)
      .maybeSingle();

    if (sErr || !student) {
      return { success: false, error: "Student record not found." };
    }

    // 2. Check for existing pending or active approved replacement request for this document type
    const { data: existingActiveRequests } = await supabase
      .from("document_replacement_requests")
      .select("id, status, document_type, authorization_expires_at")
      .eq("student_id", studentId)
      .eq("document_type", input.documentType)
      .in("status", ["pending", "approved"]);

    if (existingActiveRequests && existingActiveRequests.length > 0) {
      const pendingReq = existingActiveRequests.find(r => r.status === "pending");
      if (pendingReq) {
        return {
          success: false,
          error: `A replacement request for your ${input.documentType.toUpperCase()} is already pending review by the compliance team.`
        };
      }

      const approvedReq = existingActiveRequests.find(r => r.status === "approved");
      if (approvedReq) {
        const isExpired = this.isRequestExpired({
          status: approvedReq.status,
          authorizationExpiresAt: approvedReq.authorization_expires_at
        });
        if (!isExpired) {
          return {
            success: false,
            error: `Your replacement request for ${input.documentType.toUpperCase()} has already been approved. You can upload your new document directly.`
          };
        }
      }
    }

    // 3. Fetch current active document version metadata
    const versionTable = input.documentType === "passport" 
      ? "passport_versions" 
      : input.documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    const { data: activeVersion } = await supabase
      .from(versionTable)
      .select("version_number, expiry_date, verification_status")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .maybeSingle();

    // Check if there is already an uploaded file pending verification
    const { data: pendingVersion } = await supabase
      .from(versionTable)
      .select("id")
      .eq("student_id", studentId)
      .eq("verification_status", "pending")
      .maybeSingle();

    if (pendingVersion) {
      return {
        success: false,
        error: `A newly uploaded ${input.documentType.toUpperCase()} document is currently waiting for compliance verification. Additional replacement requests are disabled.`
      };
    }

    const currentDocVersion = activeVersion?.version_number ?? 1;
    const currentExpiryDate = activeVersion?.expiry_date ? String(activeVersion.expiry_date).split("T")[0] : null;

    // 4. Insert new replacement request
    const { data: newRecord, error: insErr } = await supabase
      .from("document_replacement_requests")
      .insert({
        student_id: studentId,
        document_type: input.documentType,
        current_document_version: currentDocVersion,
        current_expiry_date: currentExpiryDate,
        reason: input.reason,
        reason_details: input.reasonDetails.trim(),
        status: "pending",
        submitted_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (insErr || !newRecord) {
      return { success: false, error: insErr?.message || "Failed to submit replacement request." };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      action: "DOCUMENT_REPLACEMENT_REQUEST_SUBMITTED",
      resource: `document_replacement_requests/${newRecord.id}`,
      filters_applied: {
        requestId: newRecord.id,
        studentId,
        documentType: input.documentType,
        reason: input.reason,
        reasonDetails: input.reasonDetails.trim(),
        currentDocumentVersion: currentDocVersion,
        currentExpiryDate
      }
    });

    return {
      success: true,
      request: this.mapRow(newRecord)
    };
  }

  /**
   * Database: Staff Approves a replacement request
   * Creates a temporary document-specific upload authorization and updates request to APPROVED
   */
  static async approveRequest(
    requestId: string,
    staffUserId: string,
    input: ApproveReplacementRequestInput = {}
  ): Promise<{ success: boolean; authorizationId?: string; expiresAt?: string; error?: string }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // 1. Fetch current request
    const { data: request, error: rErr } = await supabase
      .from("document_replacement_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (rErr || !request) {
      return { success: false, error: "Replacement request not found." };
    }

    if (request.status !== "pending") {
      return { success: false, error: `Cannot approve request in '${request.status}' status. Only pending requests can be approved.` };
    }

    const durationDays = input.durationDays && input.durationDays > 0 ? input.durationDays : 7;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 2. Revoke any previous active authorization for this student and document type
    await supabase
      .from("student_document_upload_authorizations")
      .update({ status: "revoked", updated_at: now.toISOString() })
      .eq("student_id", request.student_id)
      .eq("document_type", request.document_type)
      .eq("status", "active");

    // 3. Create document-specific temporary upload authorization
    const reasonMapping = (request.reason === "passport_lost" ? "document_lost"
      : request.reason === "passport_damaged" ? "document_damaged"
      : request.reason === "government_replacement" ? "government_reissue"
      : request.reason === "incorrect_document" ? "data_correction"
      : "document_replaced") as "document_lost" | "document_damaged" | "document_replaced" | "government_reissue" | "data_correction" | "other";

    const { data: authRecord, error: authErr } = await supabase
      .from("student_document_upload_authorizations")
      .insert({
        student_id: request.student_id,
        document_type: request.document_type,
        reason: reasonMapping,
        reason_details: `Approved replacement request #${requestId}: ${request.reason_details}`,
        valid_from: now.toISOString(),
        valid_until: expiresAt.toISOString(),
        status: "active",
        authorized_by: staffUserId
      })
      .select("id")
      .single();

    if (authErr || !authRecord) {
      return { success: false, error: `Failed to create upload authorization: ${authErr?.message}` };
    }

    // 4. Transition replacement request to approved
    const { error: updErr } = await supabase
      .from("document_replacement_requests")
      .update({
        status: "approved",
        reviewed_by: staffUserId,
        reviewed_at: now.toISOString(),
        authorization_id: authRecord.id,
        authorization_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq("id", requestId);

    if (updErr) {
      return { success: false, error: `Failed to update replacement request: ${updErr.message}` };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      actor_id: staffUserId,
      action: "DOCUMENT_REPLACEMENT_REQUEST_APPROVED",
      resource: `document_replacement_requests/${requestId}`,
      filters_applied: {
        requestId,
        studentId: request.student_id,
        documentType: request.document_type,
        authorizationId: authRecord.id,
        validUntil: expiresAt.toISOString(),
        durationDays
      }
    });

    return {
      success: true,
      authorizationId: authRecord.id,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Database: Staff Rejects a replacement request with mandatory explanation
   */
  static async rejectRequest(
    requestId: string,
    staffUserId: string,
    input: RejectReplacementRequestInput
  ): Promise<{ success: boolean; error?: string }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    if (!input.rejectionReason || !input.rejectionReason.trim()) {
      return { success: false, error: "A mandatory rejection reason is required when declining a replacement request." };
    }

    const { data: request, error: rErr } = await supabase
      .from("document_replacement_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (rErr || !request) {
      return { success: false, error: "Replacement request not found." };
    }

    if (request.status !== "pending") {
      return { success: false, error: `Cannot reject request in '${request.status}' status.` };
    }

    const nowIso = new Date().toISOString();
    const cleanReason = input.rejectionReason.trim();

    const { error: updErr } = await supabase
      .from("document_replacement_requests")
      .update({
        status: "rejected",
        reviewed_by: staffUserId,
        reviewed_at: nowIso,
        rejection_reason: cleanReason,
        updated_at: nowIso
      })
      .eq("id", requestId);

    if (updErr) {
      return { success: false, error: `Failed to reject request: ${updErr.message}` };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      actor_id: staffUserId,
      action: "DOCUMENT_REPLACEMENT_REQUEST_REJECTED",
      resource: `document_replacement_requests/${requestId}`,
      filters_applied: {
        requestId,
        studentId: request.student_id,
        documentType: request.document_type,
        rejectionReason: cleanReason
      }
    });

    return { success: true };
  }

  /**
   * Database: Student Cancels their own pending replacement request
   */
  static async cancelRequest(
    requestId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const { data: request, error: rErr } = await supabase
      .from("document_replacement_requests")
      .select("*")
      .eq("id", requestId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (rErr || !request) {
      return { success: false, error: "Replacement request not found or not owned by student." };
    }

    if (request.status !== "pending") {
      return { success: false, error: `Cannot cancel a request that is already ${request.status}.` };
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("document_replacement_requests")
      .update({
        status: "cancelled",
        updated_at: nowIso
      })
      .eq("id", requestId);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    // Audit log
    await supabase.from("audit_log").insert({
      action: "DOCUMENT_REPLACEMENT_REQUEST_CANCELLED",
      resource: `document_replacement_requests/${requestId}`,
      filters_applied: { requestId, studentId, documentType: request.document_type }
    });

    return { success: true };
  }

  /**
   * Database: Completes replacement request when student successfully uploads new document
   */
  static async completeRequestUponUpload(
    studentId: string,
    documentType: "passport" | "visa" | "efrro",
    versionId?: string
  ): Promise<void> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const nowIso = new Date().toISOString();

    // Find any active approved request for this student and document type
    const { data: activeRequests } = await supabase
      .from("document_replacement_requests")
      .select("id, authorization_id")
      .eq("student_id", studentId)
      .eq("document_type", documentType)
      .eq("status", "approved");

    if (activeRequests && activeRequests.length > 0) {
      for (const req of activeRequests) {
        await supabase
          .from("document_replacement_requests")
          .update({
            status: "completed",
            completed_at: nowIso,
            completed_version_id: versionId || null,
            updated_at: nowIso
          })
          .eq("id", req.id);

        if (req.authorization_id) {
          await supabase
            .from("student_document_upload_authorizations")
            .update({
              status: "consumed",
              consumed_at: nowIso,
              consumed_version_id: versionId || null,
              updated_at: nowIso
            })
            .eq("id", req.authorization_id);
        }

        // Audit log
        await supabase.from("audit_log").insert({
          action: "DOCUMENT_REPLACEMENT_UPLOAD_COMPLETED",
          resource: `document_replacement_requests/${req.id}`,
          filters_applied: {
            requestId: req.id,
            studentId,
            documentType,
            completedVersionId: versionId
          }
        });
      }
    }
  }

  /**
   * Database: Fetch active request for student & document type
   */
  static async getActiveRequest(
    studentId: string,
    documentType: "passport" | "visa" | "efrro"
  ): Promise<DocumentReplacementRequestRecord | null> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // Check latest request for this document type
    const { data, error } = await supabase
      .from("document_replacement_requests")
      .select("*")
      .eq("student_id", studentId)
      .eq("document_type", documentType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const record = this.mapRow(data);

    // If status is approved but authorization has expired, mark as expired in DB
    if (record.status === "approved" && this.isRequestExpired(record)) {
      await supabase
        .from("document_replacement_requests")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", record.id);

      if (record.authorizationId) {
        await supabase
          .from("student_document_upload_authorizations")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", record.authorizationId);
      }

      record.status = "expired";
    }

    return record;
  }

  /**
   * Database: List all requests for student (Student Portal)
   */
  static async listStudentRequests(studentId: string): Promise<DocumentReplacementRequestRecord[]> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("document_replacement_requests")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRow(r));
  }

  /**
   * Database: List replacement requests for staff center with pagination and filters
   */
  static async listRequestsForStaff(filters: {
    status?: DocumentReplacementStatus | "all";
    documentType?: "passport" | "visa" | "efrro" | "all";
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ requests: DocumentReplacementRequestRecord[]; totalCount: number }> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    let query = supabase
      .from("document_replacement_requests")
      .select(`
        *,
        students(
          registration_number,
          student_personal(full_name),
          student_contact(email)
        )
      `, { count: "exact" });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.documentType && filters.documentType !== "all") {
      query = query.eq("document_type", filters.documentType);
    }

    query = query.order("created_at", { ascending: false });

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error || !data) {
      console.error("[LIST_REPLACEMENT_REQUESTS_ERROR]", error);
      return { requests: [], totalCount: 0 };
    }

    const requests: DocumentReplacementRequestRecord[] = data.map((row: any) => {
      const record = this.mapRow(row);
      const studentObj = row.students;
      const personal = Array.isArray(studentObj?.student_personal) ? studentObj.student_personal[0] : studentObj?.student_personal;
      const contact = Array.isArray(studentObj?.student_contact) ? studentObj.student_contact[0] : studentObj?.student_contact;

      record.studentFullName = personal?.full_name || "Unknown Student";
      record.studentRegistrationNumber = studentObj?.registration_number || "";
      record.studentEmail = contact?.email || "";

      return record;
    });

    // If search term is present, filter in-memory if needed
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const filtered = requests.filter(r =>
        (r.studentFullName || "").toLowerCase().includes(q) ||
        (r.studentRegistrationNumber || "").toLowerCase().includes(q) ||
        (r.reasonDetails || "").toLowerCase().includes(q) ||
        (r.documentType || "").toLowerCase().includes(q)
      );
      return { requests: filtered, totalCount: filtered.length };
    }

    return { requests, totalCount: count || requests.length };
  }

  /**
   * Database: Live count of pending replacement requests for staff dashboard badge
   */
  static async getPendingCount(): Promise<number> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    const { count, error } = await supabase
      .from("document_replacement_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) return 0;
    return count || 0;
  }

  private static mapRow(row: any): DocumentReplacementRequestRecord {
    return {
      id: row.id,
      studentId: row.student_id,
      documentType: row.document_type,
      currentDocumentVersion: row.current_document_version,
      currentExpiryDate: row.current_expiry_date,
      reason: row.reason,
      reasonDetails: row.reason_details,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
      authorizationId: row.authorization_id,
      authorizationExpiresAt: row.authorization_expires_at,
      completedAt: row.completed_at,
      completedVersionId: row.completed_version_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

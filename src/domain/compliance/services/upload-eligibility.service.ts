import type { DocumentReplacementRequestRecord } from "./replacement-request.service";

export type ComplianceDocumentType = "passport" | "visa" | "efrro";

export type EarlyUploadReason = 
  | "document_lost" 
  | "document_damaged" 
  | "document_replaced" 
  | "government_reissue" 
  | "data_correction" 
  | "other";

export interface DocumentUploadPolicy {
  id?: string;
  documentType: ComplianceDocumentType;
  uploadWindowDays: number;
  isActive: boolean;
}

export interface StudentUploadAuthorization {
  id: string;
  studentId: string;
  documentType: ComplianceDocumentType;
  reason: EarlyUploadReason;
  reasonDetails: string;
  validFrom: string;
  validUntil: string;
  status: "active" | "consumed" | "expired" | "revoked";
  authorizedBy?: string | null;
  consumedAt?: string | null;
  consumedVersionId?: string | null;
  createdAt: string;
}

export type UploadEligibilityReasonCode = 
  | "FIRST_UPLOAD"
  | "PENDING_VERIFICATION"
  | "WINDOW_OPEN"
  | "EXPIRED_DOCUMENT"
  | "EARLY_AUTHORIZATION_ACTIVE"
  | "REPLACEMENT_REQUEST_APPROVED"
  | "REPLACEMENT_REQUEST_PENDING"
  | "REPLACEMENT_REQUEST_REJECTED"
  | "OUTSIDE_WINDOW";

export interface DocumentUploadEligibilityResult {
  canUpload: boolean;
  reasonCode: UploadEligibilityReasonCode;
  documentType: ComplianceDocumentType;
  userTitle: string;
  userMessage: string;
  expiryDate: string | null;
  uploadWindowOpensDate: string | null;
  daysUntilWindowOpens: number | null;
  daysUntilExpiry: number | null;
  activeAuthorizationId?: string | null;
  authorizationExpiresAt?: string | null;
  isPendingReview: boolean;
  isFirstUpload: boolean;
  activeReplacementRequest?: DocumentReplacementRequestRecord | null;
}

export interface DocumentVersionInfo {
  versionNumber: number;
  filePath: string;
  verificationStatus: "pending" | "verified" | "rejected";
  isActive: boolean;
  expiryDate?: string | null;
  issueDate?: string | null;
}

export class DocumentUploadEligibilityEngine {
  public static readonly DEFAULT_UPLOAD_WINDOW_DAYS = 30;

  /**
   * Pure deterministic calculation for upload eligibility
   */
  public static calculateEligibility(params: {
    documentType: ComplianceDocumentType;
    activeDocument: DocumentVersionInfo | null;
    pendingDocument: DocumentVersionInfo | null;
    policyWindowDays?: number;
    activeAuthorization?: StudentUploadAuthorization | null;
    activeReplacementRequest?: DocumentReplacementRequestRecord | null;
    currentDate?: Date | string;
  }): DocumentUploadEligibilityResult {
    const { documentType, activeDocument, pendingDocument, activeAuthorization, activeReplacementRequest } = params;
    const windowDays = (params.policyWindowDays !== undefined && params.policyWindowDays > 0) 
      ? params.policyWindowDays 
      : DocumentUploadEligibilityEngine.DEFAULT_UPLOAD_WINDOW_DAYS;

    const now = params.currentDate ? new Date(params.currentDate) : new Date();
    // Normalize to midnight UTC for clean date comparisons
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const docLabel = documentType.toUpperCase();

    // 1. Check if there is already a document pending verification
    if (pendingDocument && pendingDocument.verificationStatus === "pending") {
      return {
        canUpload: false,
        reasonCode: "PENDING_VERIFICATION",
        documentType,
        userTitle: "Pending Verification",
        userMessage: `Your new ${docLabel} has been submitted and is waiting for verification by the compliance team.`,
        expiryDate: activeDocument?.expiryDate || null,
        uploadWindowOpensDate: null,
        daysUntilWindowOpens: null,
        daysUntilExpiry: activeDocument?.expiryDate ? this.computeDaysDiff(activeDocument.expiryDate, todayMidnight) : null,
        isPendingReview: true,
        isFirstUpload: false,
        activeReplacementRequest: activeReplacementRequest || null
      };
    }

    // 2. Check if student has no verified/approved document on file (First Upload)
    const hasValidActiveDoc = activeDocument && 
      activeDocument.verificationStatus === "verified" && 
      activeDocument.filePath && 
      activeDocument.filePath !== "pending_upload" &&
      activeDocument.filePath !== "null" &&
      activeDocument.expiryDate;

    if (!hasValidActiveDoc) {
      return {
        canUpload: true,
        reasonCode: "FIRST_UPLOAD",
        documentType,
        userTitle: "Document Required",
        userMessage: `No verified ${docLabel} is on file. Please upload your ${docLabel} document to complete compliance.`,
        expiryDate: null,
        uploadWindowOpensDate: null,
        daysUntilWindowOpens: 0,
        daysUntilExpiry: null,
        isPendingReview: false,
        isFirstUpload: true,
        activeReplacementRequest: activeReplacementRequest || null
      };
    }

    // 3. Current active document exists with expiry date
    const expiryStr = activeDocument.expiryDate!;
    const expiryDateObj = new Date(expiryStr);
    const expiryMidnight = new Date(Date.UTC(expiryDateObj.getUTCFullYear(), expiryDateObj.getUTCMonth(), expiryDateObj.getUTCDate()));

    // Window start date = Expiry Date - Window Days
    const windowStartMidnight = new Date(expiryMidnight.getTime() - (windowDays * 24 * 60 * 60 * 1000));
    const windowStartISO = windowStartMidnight.toISOString().split("T")[0];

    const daysUntilExpiry = Math.ceil((expiryMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilWindowOpens = Math.ceil((windowStartMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

    // 4. If document is already expired (daysUntilExpiry <= 0)
    if (daysUntilExpiry <= 0) {
      return {
        canUpload: true,
        reasonCode: "EXPIRED_DOCUMENT",
        documentType,
        userTitle: "Document Expired",
        userMessage: `Your ${docLabel} expired on ${this.formatDisplayDate(expiryStr)}. Please upload your renewal document immediately.`,
        expiryDate: expiryStr,
        uploadWindowOpensDate: windowStartISO,
        daysUntilWindowOpens: 0,
        daysUntilExpiry,
        isPendingReview: false,
        isFirstUpload: false,
        activeReplacementRequest: activeReplacementRequest || null
      };
    }

    // 5. If current date is inside the pre-expiry window
    if (todayMidnight.getTime() >= windowStartMidnight.getTime()) {
      return {
        canUpload: true,
        reasonCode: "WINDOW_OPEN",
        documentType,
        userTitle: "Expiring Soon — Upload Open",
        userMessage: `Your ${docLabel} is approaching its expiry date (${this.formatDisplayDate(expiryStr)}). You can now upload your new ${docLabel}.`,
        expiryDate: expiryStr,
        uploadWindowOpensDate: windowStartISO,
        daysUntilWindowOpens: 0,
        daysUntilExpiry,
        isPendingReview: false,
        isFirstUpload: false,
        activeReplacementRequest: activeReplacementRequest || null
      };
    }

    // 6. Check for active Approved Replacement Request / Staff Early Upload Authorization
    if (activeReplacementRequest && activeReplacementRequest.status === "approved" && activeReplacementRequest.authorizationExpiresAt) {
      const expiresAt = new Date(activeReplacementRequest.authorizationExpiresAt);
      if (now.getTime() <= expiresAt.getTime()) {
        return {
          canUpload: true,
          reasonCode: "REPLACEMENT_REQUEST_APPROVED",
          documentType,
          userTitle: "Replacement Approved",
          userMessage: `Your replacement request was approved by the compliance team. You can now upload your new ${docLabel} document until ${this.formatDisplayDate(activeReplacementRequest.authorizationExpiresAt)}.`,
          expiryDate: expiryStr,
          uploadWindowOpensDate: windowStartISO,
          daysUntilWindowOpens,
          daysUntilExpiry,
          activeAuthorizationId: activeReplacementRequest.authorizationId,
          authorizationExpiresAt: activeReplacementRequest.authorizationExpiresAt,
          isPendingReview: false,
          isFirstUpload: false,
          activeReplacementRequest
        };
      }
    }

    if (activeAuthorization && activeAuthorization.status === "active") {
      const authValidFrom = new Date(activeAuthorization.validFrom);
      const authValidUntil = new Date(activeAuthorization.validUntil);

      if (now.getTime() >= authValidFrom.getTime() && now.getTime() <= authValidUntil.getTime()) {
        const reasonHuman = this.formatReason(activeAuthorization.reason);
        return {
          canUpload: true,
          reasonCode: "EARLY_AUTHORIZATION_ACTIVE",
          documentType,
          userTitle: "Early Upload Authorized",
          userMessage: `Early ${docLabel} upload authorized by compliance staff (${reasonHuman}): ${activeAuthorization.reasonDetails}`,
          expiryDate: expiryStr,
          uploadWindowOpensDate: windowStartISO,
          daysUntilWindowOpens,
          daysUntilExpiry,
          activeAuthorizationId: activeAuthorization.id,
          authorizationExpiresAt: activeAuthorization.validUntil,
          isPendingReview: false,
          isFirstUpload: false,
          activeReplacementRequest: activeReplacementRequest || null
        };
      }
    }

    // 7. Check if a replacement request is currently Pending Review
    if (activeReplacementRequest && activeReplacementRequest.status === "pending") {
      return {
        canUpload: false,
        reasonCode: "REPLACEMENT_REQUEST_PENDING",
        documentType,
        userTitle: "Replacement Request Pending",
        userMessage: `Your early replacement request for ${docLabel} submitted on ${this.formatDisplayDate(activeReplacementRequest.submittedAt)} is currently under review by the compliance team.`,
        expiryDate: expiryStr,
        uploadWindowOpensDate: windowStartISO,
        daysUntilWindowOpens,
        daysUntilExpiry,
        isPendingReview: false,
        isFirstUpload: false,
        activeReplacementRequest
      };
    }

    // 8. Outside window and no active exception: Upload is disabled
    return {
      canUpload: false,
      reasonCode: "OUTSIDE_WINDOW",
      documentType,
      userTitle: "Document Verified",
      userMessage: `Your current ${docLabel} is valid until ${this.formatDisplayDate(expiryStr)}. You can upload a replacement when the expiry date approaches.`,
      expiryDate: expiryStr,
      uploadWindowOpensDate: windowStartISO,
      daysUntilWindowOpens,
      daysUntilExpiry,
      isPendingReview: false,
      isFirstUpload: false,
      activeReplacementRequest: activeReplacementRequest || null
    };
  }

  /**
   * Evaluates upload eligibility for a student against live database records
   */
  public static async evaluateEligibility(
    studentId: string,
    documentType: ComplianceDocumentType,
    currentDate?: Date | string
  ): Promise<DocumentUploadEligibilityResult> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();

    // 1. Fetch policy for document type
    const { data: policyData } = await supabase
      .from("document_upload_policies")
      .select("upload_window_days, is_active")
      .eq("document_type", documentType)
      .maybeSingle();

    const policyWindowDays = (policyData?.is_active && policyData.upload_window_days > 0)
      ? policyData.upload_window_days
      : DocumentUploadEligibilityEngine.DEFAULT_UPLOAD_WINDOW_DAYS;

    // 2. Fetch document versions for student
    const tableName = documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

    const { data: versions } = await supabase
      .from(tableName)
      .select("version_number, file_path, verification_status, is_active, expiry_date, issue_date, deleted_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("version_number", { ascending: false });

    const isVerified = (status?: string | null) => status?.toLowerCase() === "verified" || status?.toLowerCase() === "approved";
    const isPending = (status?: string | null) => status?.toLowerCase() === "pending" || status?.toLowerCase() === "pending_verification";

    const activeDoc = versions?.find(v => v.is_active === true && isVerified(v.verification_status)) || null;
    const pendingDoc = versions?.find(v => isPending(v.verification_status)) || null;

    // 3. Fetch active early authorization if any
    const nowIso = (currentDate ? new Date(currentDate) : new Date()).toISOString();
    const { data: authData } = await supabase
      .from("student_document_upload_authorizations")
      .select("*")
      .eq("student_id", studentId)
      .eq("document_type", documentType)
      .eq("status", "active")
      .lte("valid_from", nowIso)
      .gte("valid_until", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeAuth: StudentUploadAuthorization | null = authData ? {
      id: authData.id,
      studentId: authData.student_id,
      documentType: authData.document_type,
      reason: authData.reason,
      reasonDetails: authData.reason_details,
      validFrom: authData.valid_from,
      validUntil: authData.valid_until,
      status: authData.status,
      authorizedBy: authData.authorized_by,
      consumedAt: authData.consumed_at,
      consumedVersionId: authData.consumed_version_id,
      createdAt: authData.created_at
    } : null;

    // 4. Fetch latest replacement request
    const { DocumentReplacementRequestService } = await import("./replacement-request.service");
    const activeReplacementRequest = await DocumentReplacementRequestService.getActiveRequest(studentId, documentType);

    // Resolve active document version info
    const resolvedActiveDoc = activeDoc ? {
      versionNumber: activeDoc.version_number,
      filePath: activeDoc.file_path,
      verificationStatus: isVerified(activeDoc.verification_status) ? "verified" as const : "pending" as const,
      isActive: activeDoc.is_active,
      expiryDate: activeDoc.expiry_date,
      issueDate: activeDoc.issue_date
    } : null;

    return this.calculateEligibility({
      documentType,
      activeDocument: resolvedActiveDoc,
      pendingDocument: pendingDoc ? {
        versionNumber: pendingDoc.version_number,
        filePath: pendingDoc.file_path,
        verificationStatus: "pending",
        isActive: pendingDoc.is_active,
        expiryDate: pendingDoc.expiry_date,
        issueDate: pendingDoc.issue_date
      } : null,
      policyWindowDays,
      activeAuthorization: activeAuth,
      activeReplacementRequest,
      currentDate
    });
  }

  /**
   * Closes / marks as consumed any active early upload authorization for student & doc type,
   * and completes any linked replacement request.
   */
  public static async consumeActiveAuthorization(
    studentId: string,
    documentType: ComplianceDocumentType,
    versionId?: string | null
  ): Promise<void> {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    const supabase = getAdminSupabase();
    await supabase
      .from("student_document_upload_authorizations")
      .update({
        status: "consumed",
        consumed_at: new Date().toISOString(),
        consumed_version_id: versionId || null,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId)
      .eq("document_type", documentType)
      .eq("status", "active");

    const { DocumentReplacementRequestService } = await import("./replacement-request.service");
    await DocumentReplacementRequestService.completeRequestUponUpload(studentId, documentType, versionId || undefined).catch(() => null);
  }

  private static computeDaysDiff(targetDateStr: string, fromDate: Date): number {
    const target = new Date(targetDateStr);
    const targetMidnight = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
    return Math.ceil((targetMidnight.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  public static formatDisplayDate(dateStr?: string | null): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  public static formatReason(reason: EarlyUploadReason): string {
    switch (reason) {
      case "document_lost": return "Document Lost";
      case "document_damaged": return "Document Damaged";
      case "document_replaced": return "Document Replaced";
      case "government_reissue": return "Government Reissue";
      case "data_correction": return "Data Correction";
      case "other": return "Exceptional Circumstances";
      default: return "Authorized Exception";
    }
  }
}

/**
 * Single authoritative domain function for determining whether a student is currently allowed to upload a specific document.
 */
export async function canStudentUploadDocument(
  studentId: string,
  documentType: ComplianceDocumentType,
  currentDate?: Date | string
): Promise<DocumentUploadEligibilityResult> {
  return DocumentUploadEligibilityEngine.evaluateEligibility(studentId, documentType, currentDate);
}


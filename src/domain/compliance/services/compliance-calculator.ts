import { CalendarDateEngine } from "@/domain/notifications/services/calendar-date";
import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";

export type DocumentStatus = 
  | "MISSING" 
  | "EXPIRED" 
  | "WARNING" 
  | "COMPLIANT" 
  | "REJECTED" 
  | "PENDING_VERIFICATION"
  | "NOT_APPLICABLE";

export type OverallComplianceStatus = 
  | "COMPLIANT" 
  | "WARNING" 
  | "EXPIRED" 
  | "PENDING_VERIFICATION" 
  | "REJECTED" 
  | "MISSING";

export interface DocumentEvaluationInput {
  number?: string | null;
  expiry?: string | Date | null;
  status?: string | null;
  issueDate?: string | Date | null;
}

export interface StudentComplianceEvaluationInput {
  passport?: DocumentEvaluationInput | null;
  visa?: DocumentEvaluationInput | null;
  efrro?: DocumentEvaluationInput | null;
  isPassportRequired?: boolean;
  isVisaRequired?: boolean;
  isEfrroRequired?: boolean;
  nationality?: string | null;
}

export interface DocumentEvaluationResult {
  status: DocumentStatus;
  daysRemaining: number | null;
  isExpired: boolean;
  isCritical: boolean; // <= 15 days
  isWarning: boolean;  // <= 30 days
  hasValidRecord: boolean; // true ONLY when number is non-empty and expiry date is valid
}

export interface StudentComplianceEvaluationResult {
  passport: DocumentEvaluationResult;
  visa: DocumentEvaluationResult;
  efrro: DocumentEvaluationResult;
  overallStatus: OverallComplianceStatus;
  complianceScore: number;
  isFullyCompliant: boolean;
  hasMissingRequiredData: boolean;
  hasExpiredDocument: boolean;
  hasCriticalDocument: boolean;
  hasWarningDocument: boolean;
  hasPendingVerification: boolean;
  hasRejectedDocument: boolean;
  daysUntilEfrroExpiry: number | null;
}

/**
 * Authoritative single source of truth for international student compliance calculation in ISCMS.
 * 
 * CORE PRINCIPLE: Missing compliance information ≠ compliant.
 * Positive compliance can ONLY be returned when all applicable required documents
 * (Passport, Visa, eFRRO) have been positively verified as present, valid, and not near expiry.
 */
export class ComplianceCalculator {
  /**
   * Normalizes any date representation (string, Date, undefined, null) into clean YYYY-MM-DD string.
   */
  static normalizeDate(dateVal?: string | Date | null): string | null {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return null;
      return CalendarDateEngine.toISODate(dateVal);
    }
    const clean = String(dateVal).trim();
    if (!clean) return null;
    const parsed = CalendarDateEngine.parseDateOnly(clean);
    if (isNaN(parsed.getTime())) return null;
    return CalendarDateEngine.toISODate(parsed);
  }

  /**
   * Evaluates a single document's validity and expiry compliance state.
   */
  static evaluateDocument(
    input?: DocumentEvaluationInput | null,
    isRequired: boolean = true,
    todayISO?: string
  ): DocumentEvaluationResult {
    const today = todayISO || CalendarDateEngine.getTodayISO();
    const docNum = input?.number ? String(input.number).trim() : "";
    const expiryISO = this.normalizeDate(input?.expiry);

    // If not required (e.g. eFRRO for Indian nationals), document is NOT_APPLICABLE
    if (!isRequired) {
      return {
        status: "NOT_APPLICABLE",
        daysRemaining: null,
        isExpired: false,
        isCritical: false,
        isWarning: false,
        hasValidRecord: Boolean(docNum && expiryISO)
      };
    }

    // If number or expiry date is absent or empty:
    if (!docNum || !expiryISO) {
      return {
        status: "MISSING",
        daysRemaining: null,
        isExpired: false,
        isCritical: false,
        isWarning: false,
        hasValidRecord: false
      };
    }

    const diffDays = CalendarDateEngine.diffCalendarDays(expiryISO, today);
    const isExpired = diffDays < 0;
    const isCritical = diffDays >= 0 && diffDays <= 15;
    const isWarning = diffDays >= 0 && diffDays <= 30;

    let status: DocumentStatus = "COMPLIANT";
    if (isExpired) {
      status = "EXPIRED";
    } else if (isWarning) {
      status = "WARNING";
    }

    // Override with explicit administrative review statuses if provided
    const rawStatus = (input?.status || "").toUpperCase().trim();
    if (rawStatus === "REJECTED") {
      status = "REJECTED";
    } else if (rawStatus === "PENDING_VERIFICATION" || rawStatus === "PENDING") {
      status = "PENDING_VERIFICATION";
    }

    return {
      status,
      daysRemaining: diffDays,
      isExpired,
      isCritical,
      isWarning,
      hasValidRecord: true
    };
  }

  /**
   * Evaluates overall student compliance across all applicable documents.
   * 
   * Strict precedence:
   * 1. Any required document EXPIRED -> EXPIRED (score: 10)
   * 2. Any required document REJECTED -> REJECTED (score: 10)
   * 3. Any required document MISSING -> MISSING (score: 0) — MISSING DATA NEVER PASSES
   * 4. Any required document WARNING / CRITICAL -> WARNING (score: 70)
   * 5. Any required document PENDING_VERIFICATION -> PENDING_VERIFICATION (score: 50)
   * 6. ALL required documents present, valid, and >30d -> COMPLIANT (score: 100)
   */
  static evaluateStudentCompliance(
    input: StudentComplianceEvaluationInput,
    todayISO?: string
  ): StudentComplianceEvaluationResult {
    const today = todayISO || CalendarDateEngine.getTodayISO();
    const isPassportRequired = input.isPassportRequired !== false;
    const isVisaRequired = input.isVisaRequired !== false;
    const isEfrroRequired = input.isEfrroRequired !== undefined
      ? input.isEfrroRequired
      : (input.nationality ? isEfrroApplicable(input.nationality) : true);

    const passportRes = this.evaluateDocument(input.passport, isPassportRequired, today);
    const visaRes = this.evaluateDocument(input.visa, isVisaRequired, today);
    const efrroRes = this.evaluateDocument(input.efrro, isEfrroRequired, today);

    const hasExpiredDocument = 
      (isPassportRequired && passportRes.isExpired) ||
      (isVisaRequired && visaRes.isExpired) ||
      (isEfrroRequired && efrroRes.isExpired);

    const hasRejectedDocument = 
      (isPassportRequired && passportRes.status === "REJECTED") ||
      (isVisaRequired && visaRes.status === "REJECTED") ||
      (isEfrroRequired && efrroRes.status === "REJECTED");

    const hasMissingRequiredData = 
      (isPassportRequired && (!passportRes.hasValidRecord || passportRes.status === "MISSING")) ||
      (isVisaRequired && (!visaRes.hasValidRecord || visaRes.status === "MISSING")) ||
      (isEfrroRequired && (!efrroRes.hasValidRecord || efrroRes.status === "MISSING"));

    const hasCriticalDocument = 
      (isPassportRequired && passportRes.isCritical) ||
      (isVisaRequired && visaRes.isCritical) ||
      (isEfrroRequired && efrroRes.isCritical);

    const hasWarningDocument = 
      (isPassportRequired && passportRes.isWarning) ||
      (isVisaRequired && visaRes.isWarning) ||
      (isEfrroRequired && efrroRes.isWarning);

    const hasPendingVerification = 
      (isPassportRequired && passportRes.status === "PENDING_VERIFICATION") ||
      (isVisaRequired && visaRes.status === "PENDING_VERIFICATION") ||
      (isEfrroRequired && efrroRes.status === "PENDING_VERIFICATION");

    let overallStatus: OverallComplianceStatus = "COMPLIANT";
    let complianceScore = 100;

    if (hasExpiredDocument) {
      overallStatus = "EXPIRED";
      complianceScore = 10;
    } else if (hasRejectedDocument) {
      overallStatus = "REJECTED";
      complianceScore = 10;
    } else if (hasMissingRequiredData) {
      overallStatus = "MISSING";
      complianceScore = 0;
    } else if (hasWarningDocument) {
      overallStatus = "WARNING";
      complianceScore = 70;
    } else if (hasPendingVerification) {
      overallStatus = "PENDING_VERIFICATION";
      complianceScore = 50;
    } else {
      // Positive assertion: all required documents must have valid records
      const allRequiredPresent = 
        (!isPassportRequired || passportRes.hasValidRecord) &&
        (!isVisaRequired || visaRes.hasValidRecord) &&
        (!isEfrroRequired || efrroRes.hasValidRecord);

      if (!allRequiredPresent) {
        overallStatus = "MISSING";
        complianceScore = 0;
      } else {
        overallStatus = "COMPLIANT";
        complianceScore = 100;
      }
    }

    const isFullyCompliant = overallStatus === "COMPLIANT";

    return {
      passport: passportRes,
      visa: visaRes,
      efrro: efrroRes,
      overallStatus,
      complianceScore,
      isFullyCompliant,
      hasMissingRequiredData,
      hasExpiredDocument,
      hasCriticalDocument,
      hasWarningDocument,
      hasPendingVerification,
      hasRejectedDocument,
      daysUntilEfrroExpiry: isEfrroRequired ? efrroRes.daysRemaining : null
    };
  }

  /**
   * Maps raw compliance status string to frontend badge identifier.
   */
  static mapComplianceToBadge(rawStatus?: string | null): "compliant" | "warning" | "non_compliant" | "expired" {
    if (!rawStatus) return "non_compliant";
    const upper = String(rawStatus).toUpperCase().trim();
    if (upper === "COMPLIANT") return "compliant";
    if (upper === "WARNING" || upper === "PENDING_VERIFICATION" || upper === "PENDING") return "warning";
    if (upper === "EXPIRED") return "expired";
    // MISSING, REJECTED, NOT_RECORDED, etc.
    return "non_compliant";
  }

  /**
   * Returns human-readable label for compliance status.
   */
  static formatComplianceStatusText(rawStatus?: string | null): string {
    if (!rawStatus) return "Incomplete";
    const upper = String(rawStatus).toUpperCase().trim();
    switch (upper) {
      case "COMPLIANT":
        return "Fully Compliant";
      case "WARNING":
        return "Expiring Soon";
      case "EXPIRED":
        return "Expired";
      case "PENDING_VERIFICATION":
      case "PENDING":
        return "Pending Review";
      case "REJECTED":
        return "Rejected";
      case "MISSING":
      default:
        return "Incomplete";
    }
  }
}

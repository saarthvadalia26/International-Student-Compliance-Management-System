/**
 * ISCMS Authoritative Visa Applicability Rule
 *
 * Single source of truth for determining whether Student Visa compliance
 * applies to a student based on nationality, admission category, and admission track.
 *
 * BUSINESS RULE INVARIANT:
 * A student does NOT require a Visa ONLY when ALL of these conditions are true:
 *   1. Nationality = India (IND / India / Indian / IN / 356)
 *   AND
 *   2. Admission Category = Other
 *   AND
 *   3. Admission Track = CIWGC (Children of Indian Workers in Gulf Countries)
 *
 * For this exact combination:
 *   Visa section / requirement = DISABLED / NOT APPLICABLE
 *
 * In ALL other circumstances:
 *   Visa is REQUIRED / AVAILABLE according to standard ISCMS business logic.
 *
 * STRICT BOUNDARIES:
 * - Do NOT disable Visa simply because Nationality = India.
 * - All THREE conditions must be satisfied simultaneously.
 * - Fail-closed: If context is missing, defaults to TRUE (Visa applicable).
 */

import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";

export interface VisaApplicabilityContext {
  nationality?: string | null;
  admissionCategory?: string | null;
  admissionTrack?: string | null;
  admissionCategoryOther?: string | null;
}

/**
 * Checks if a nationality string represents India.
 * Reuses the authoritative ISO country normalization from eFRRO applicability.
 */
export function isIndianNationality(nationality?: string | null): boolean {
  if (!nationality) return false;
  // In ISCMS, isEfrroApplicable returns false strictly for Indian nationals
  return !isEfrroApplicable(nationality);
}

/**
 * Evaluates whether Student Visa requirements apply to a student given their context.
 *
 * @param context - Object containing nationality, admissionCategory, and admissionTrack/admissionCategoryOther
 * @returns false ONLY if Nationality is India AND Category is Other AND Track is CIWGC; true otherwise
 */
export function isVisaApplicable(context?: VisaApplicabilityContext | null): boolean {
  if (!context) {
    return true; // Fail-closed default
  }

  const { nationality, admissionCategory, admissionTrack, admissionCategoryOther } = context;

  // 1. Condition 1: Nationality must be India
  if (!isIndianNationality(nationality)) {
    return true;
  }

  // 2. Condition 2: Admission Category must be 'other'
  const category = (admissionCategory || "").trim().toLowerCase();
  if (category !== "other") {
    return true;
  }

  // 3. Condition 3: Admission Track must be 'CIWGC'
  const rawTrack = (admissionTrack || admissionCategoryOther || "").trim().toUpperCase();
  const isCiwgc = rawTrack === "CIWGC" || rawTrack.startsWith("CIWGC");

  if (!isCiwgc) {
    return true;
  }

  // All 3 conditions satisfied: Visa is NOT applicable
  return false;
}

/**
 * Convenience helper: Returns true if the student is exempt from Visa requirements.
 */
export function isVisaExempt(context?: VisaApplicabilityContext | null): boolean {
  return !isVisaApplicable(context);
}

/**
 * Returns canonical Visa status string for display or snapshot storage.
 */
export function getAuthoritativeVisaStatus(
  context?: VisaApplicabilityContext | null,
  rawStatus?: string | null,
  hasRecord?: boolean
): "NOT_APPLICABLE" | "COMPLIANT" | "WARNING" | "EXPIRED" | "MISSING" | "PENDING_VERIFICATION" | "REJECTED" {
  if (!isVisaApplicable(context)) {
    return "NOT_APPLICABLE";
  }

  const upper = (rawStatus || "").trim().toUpperCase();
  if (upper === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (upper === "COMPLIANT" || upper === "VERIFIED") return "COMPLIANT";
  if (upper === "WARNING") return "WARNING";
  if (upper === "EXPIRED") return "EXPIRED";
  if (upper === "PENDING_VERIFICATION" || upper === "PENDING") return "PENDING_VERIFICATION";
  if (upper === "REJECTED") return "REJECTED";

  return hasRecord ? "COMPLIANT" : "MISSING";
}

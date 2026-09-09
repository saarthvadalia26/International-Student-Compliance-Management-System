/**
 * ISCMS Authoritative eFRRO Applicability Rule
 *
 * Single source of truth for determining whether Foreigners Regional
 * Registration Office (eFRRO) compliance applies to a student based on nationality.
 *
 * INVARIANT:
 * - Indian nationals (India / IND / Indian) -> eFRRO is NOT APPLICABLE.
 * - Non-Indian nationals -> eFRRO IS APPLICABLE (standard international student rules apply).
 * - Fail-closed: If nationality is null, undefined, or empty, defaults to TRUE.
 */

import { normalizeCountryInputSync } from "@/domain/countries/country-utils";

/**
 * Evaluates whether eFRRO requirements apply to a student given their nationality.
 *
 * @param nationality - Country name, demonym, ISO-2, ISO-3, or numeric code
 * @returns false if nationality is definitively India; true otherwise
 */
export function isEfrroApplicable(nationality?: string | null): boolean {
  if (!nationality) {
    // Fail-closed invariant: Default to applicable for unspecified nationality
    return true;
  }

  const clean = nationality.trim();
  if (!clean) {
    return true;
  }

  // 1. Authoritative ISO Master Countries normalization
  const normalized = normalizeCountryInputSync(clean);
  if (normalized) {
    return normalized.isoAlpha3 !== "IND";
  }

  // 2. Direct string fallback checks for non-standard or raw representations
  const lower = clean.toLowerCase();
  if (
    lower === "india" || 
    lower === "indian" || 
    lower === "ind" || 
    lower === "in" || 
    lower === "republic of india"
  ) {
    return false;
  }

  return true;
}

/**
 * Returns canonical eFRRO status string for display or snapshot storage.
 */
export function getAuthoritativeEfrroStatus(
  nationality?: string | null,
  rawStatus?: string | null,
  hasRecord?: boolean
): "NOT_APPLICABLE" | "COMPLIANT" | "WARNING" | "EXPIRED" | "MISSING" | "PENDING_VERIFICATION" | "REJECTED" {
  if (!isEfrroApplicable(nationality)) {
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

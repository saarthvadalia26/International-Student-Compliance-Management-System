/**
 * Admissions Intake Distribution & Operational Timeline Domain Aggregators
 * 
 * Enterprise Standard:
 * - Timezone-safe date decomposition via parseDateOnlyString
 * - Strict Year + Month grouping (YYYY-MM composite key prevents collision across years)
 * - Deterministic chronological sorting
 * - Filters out null / empty dates
 * - No hardcoded month assumptions or fixed ranges
 */

import { parseDateOnlyString } from "@/lib/utils/date";

export interface IntakeDataPoint {
  name: string;
  value: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Aggregates student admission dates into chronological monthly cohorts.
 * 
 * @param rows - Array of records containing admission_date (ISO YYYY-MM-DD or DD/MM/YYYY)
 * @returns Array of { name: "Mon YYYY", value: count } sorted chronologically
 */
export function aggregateMonthlyAdmissions(
  rows: Array<{ admission_date?: string | null }>
): IntakeDataPoint[] {
  const admissionCounts: Record<string, { label: string; count: number }> = {};

  rows.forEach(row => {
    if (!row.admission_date) return;
    const parts = parseDateOnlyString(String(row.admission_date));
    if (!parts) return;

    // Strict composite key: "YYYY-MM" (e.g. "2026-09") ensures distinct years (e.g. 2025 vs 2026)
    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[parts.month - 1]} ${parts.year}`;

    if (!admissionCounts[key]) {
      admissionCounts[key] = { label, count: 0 };
    }
    admissionCounts[key].count += 1;
  });

  return Object.keys(admissionCounts)
    .sort() // Chronological sorting by YYYY-MM
    .map(key => ({
      name: admissionCounts[key].label,
      value: admissionCounts[key].count
    }));
}

/**
 * Aggregates upcoming non-compliant eFRRO permit expiries into monthly milestones.
 * 
 * @param rows - Array of records containing efrro_expiry and efrro_status
 * @returns Array of { name: "Mon YYYY", value: count } sorted chronologically
 */
export function aggregateEfrroExpiryTimeline(
  rows: Array<{ efrro_expiry?: string | null; efrro_status?: string | null }>
): IntakeDataPoint[] {
  const expiryCounts: Record<string, { label: string; count: number }> = {};

  rows.forEach(row => {
    if (!row.efrro_expiry || row.efrro_status === "COMPLIANT") return;
    const parts = parseDateOnlyString(String(row.efrro_expiry));
    if (!parts) return;

    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[parts.month - 1]} ${parts.year}`;

    if (!expiryCounts[key]) {
      expiryCounts[key] = { label, count: 0 };
    }
    expiryCounts[key].count += 1;
  });

  return Object.keys(expiryCounts)
    .sort()
    .map(key => ({
      name: expiryCounts[key].label,
      value: expiryCounts[key].count
    }));
}

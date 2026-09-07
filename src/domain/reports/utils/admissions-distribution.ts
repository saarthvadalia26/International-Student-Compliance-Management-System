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

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Extracts numeric { year, month } (1-indexed month) from an ISO timestamp or date string
 * in the specified institutional timezone (defaults to Asia/Kolkata, UTC+5:30).
 */
export function getYearMonthInTimezone(
  dateInput: Date | string,
  timezone: string = APP_TIMEZONE
): { year: number; month: number } | null {
  try {
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [y, m] = dateInput.trim().split("-").map(Number);
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
        return { year: y, month: m };
      }
    }
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return null;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric"
    });
    const parts = formatter.formatToParts(d);
    let year = 0;
    let month = 0;
    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10);
      if (part.type === "month") month = parseInt(part.value, 10);
    }
    if (year > 0 && month >= 1 && month <= 12) {
      return { year, month };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Aggregates student registration dates into chronological monthly cohorts.
 * 
 * - Authoritative Date: Prioritizes students.created_at (the timestamp when the student
 *   profile was registered in ISCMS)
 * - Timezone Safety: Evaluates calendar months in the institution's timezone (Asia/Kolkata)
 * - Continuous Timeline: Dynamically generates all continuous months from the start of the
 *   current intake cycle (July of academic year) or earliest student registration up to the
 *   current active calendar month.
 * - Empty Months: Real 0 counts for months with no student registrations (never fabricated).
 * - Future Months: Automatically expands as the calendar month advances without code changes.
 * 
 * @param rows - Array of student records containing created_at or admission_date
 * @returns Array of { name: "Mon YYYY", value: count } sorted chronologically
 */
export function aggregateMonthlyAdmissions(
  rows: Array<{ created_at?: string | null; date?: string | null; admission_date?: string | null }>
): IntakeDataPoint[] {
  const counts: Record<string, number> = {};

  rows.forEach(row => {
    // Prefer created_at (authoritative registration timestamp) over fallback admission_date
    const rawDate = row.created_at || row.date || row.admission_date;
    if (!rawDate) return;

    const ym = getYearMonthInTimezone(rawDate);
    if (!ym) return;

    const key = `${ym.year}-${String(ym.month).padStart(2, "0")}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  // Current calendar month in institutional timezone
  const now = new Date();
  const currentYM = getYearMonthInTimezone(now) || {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };

  // Determine earliest and latest recorded registration month key from data
  const dataKeys = Object.keys(counts).sort();
  const earliestDataKey = dataKeys.length > 0 ? dataKeys[0] : null;
  const latestDataKey = dataKeys.length > 0 ? dataKeys[dataKeys.length - 1] : null;

  // The institutional academic intake cycle starts in July (e.g. July 2026 for AY 2026-2027)
  const intakeStartYear = currentYM.month >= 7 ? currentYM.year : currentYM.year - 1;
  const intakeStartKey = `${intakeStartYear}-07`;

  // Start from earlier of intake cycle start or earliest student registration
  const effectiveStartKey = earliestDataKey && earliestDataKey < intakeStartKey
    ? earliestDataKey
    : intakeStartKey;

  // End at later of current active calendar month or latest student registration
  const currentMonthKey = `${currentYM.year}-${String(currentYM.month).padStart(2, "0")}`;
  const effectiveEndKey = latestDataKey && latestDataKey > currentMonthKey
    ? latestDataKey
    : currentMonthKey;

  const [startYear, startMonth] = effectiveStartKey.split("-").map(Number);
  const [endYear, endMonth] = effectiveEndKey.split("-").map(Number);

  let curY = startYear;
  let curM = startMonth;
  const result: IntakeDataPoint[] = [];

  while (curY < endYear || (curY === endYear && curM <= endMonth)) {
    const k = `${curY}-${String(curM).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[curM - 1]} ${curY}`;
    result.push({
      name: label,
      value: counts[k] || 0
    });
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return result;
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

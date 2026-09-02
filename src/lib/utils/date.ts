/**
 * Centralized Date & DateTime Formatting Utilities for ISCMS
 * 
 * Global Enterprise Standard:
 * - Date: DD/MM/YYYY (e.g. "05/09/2026")
 * - DateTime: DD/MM/YYYY, HH:mm (e.g. "05/09/2026, 14:30")
 * 
 * TIMEZONE SAFETY:
 * Date-only strings ("YYYY-MM-DD" or "YYYY-MM-DDT00:00:00...") are parsed by extracting
 * the numeric date components directly to avoid UTC/local midnight conversion shifting bugs.
 */

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Parses a date-only string (e.g. "2026-09-05") into numeric year, month (1-12), and day (1-31)
 * without timezone conversions.
 */
export function parseDateOnlyString(val: string): DateParts | null {
  if (!val || typeof val !== "string") return null;
  const clean = val.trim();
  
  // Format: YYYY-MM-DD or YYYY-MM-DD...
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // Format: DD/MM/YYYY
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  return null;
}

/**
 * Standard user-facing date formatter.
 * Always formats as DD/MM/YYYY (e.g. "05/09/2026").
 * 
 * Timezone-safe for date-only values.
 * 
 * @param date - Date object, ISO string, or date string
 * @param fallback - String returned when date is empty or invalid (defaults to "—")
 */
export function formatDate(date: string | Date | null | undefined, fallback: string = "—"): string {
  if (!date) return fallback;

  if (typeof date === "string") {
    const clean = date.trim();
    if (!clean || clean.toLowerCase() === "n/a" || clean.toLowerCase() === "not recorded" || clean.toLowerCase() === "not provided") {
      return fallback;
    }

    // Attempt timezone-safe date-only parsing first
    const parts = parseDateOnlyString(clean);
    if (parts) {
      const dayPadded = String(parts.day).padStart(2, "0");
      const monthPadded = String(parts.month).padStart(2, "0");
      return `${dayPadded}/${monthPadded}/${parts.year}`;
    }

    // Fallback to Date object parsing for complex timestamps
    const dt = new Date(clean);
    if (isNaN(dt.getTime())) return fallback;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return fallback;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return fallback;
}

/**
 * Standard user-facing datetime formatter.
 * Formats as DD/MM/YYYY, HH:mm (e.g. "05/09/2026, 14:30").
 * 
 * @param date - Date object, ISO string, or date string
 * @param fallback - String returned when date is empty or invalid (defaults to "—")
 */
export function formatDateTime(date: string | Date | null | undefined, fallback: string = "—"): string {
  if (!date) return fallback;

  const dt = typeof date === "string" ? new Date(date) : date;
  if (!(dt instanceof Date) || isNaN(dt.getTime())) {
    return fallback;
  }

  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

/**
 * Standard formatter for spreadsheet / Excel / CSV exports.
 * Guaranteed to format as DD/MM/YYYY.
 */
export function formatDateForExcel(date: unknown): string {
  if (!date) return "N/A";
  const formatted = formatDate(date as string | Date, "N/A");
  return formatted === "—" ? "N/A" : formatted;
}

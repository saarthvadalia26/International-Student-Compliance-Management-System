/**
 * Centralized Date & DateTime Formatting and Parsing Utilities for ISCMS
 * 
 * Global Enterprise Standard:
 * - User-Facing Date Format: DD/MM/YYYY (e.g. "05/09/2026", "15/08/2026")
 * - User-Facing DateTime Format: DD/MM/YYYY, HH:mm (e.g. "05/09/2026, 14:30")
 * - Database Storage Format: YYYY-MM-DD (PostgreSQL date)
 * 
 * TIMEZONE & AMBIGUITY SAFETY:
 * 1. "02/03/2026" is STRICTLY parsed as Day=2, Month=3, Year=2026 (2 March 2026).
 * 2. Date-only strings are parsed without timezone conversions to prevent midnight shifting bugs.
 * 3. Calendar validation enforces real days per month (including leap years).
 */

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Validates if the given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum number of days in a given month for a given year.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Validates if the year, month, and day form a valid calendar date.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const maxDays = getDaysInMonth(year, month);
  return day <= maxDays;
}

/**
 * Validates if a string is a valid DD/MM/YYYY formatted date.
 * Rejects invalid format or invalid calendar dates (e.g., 32/01/2026, 31/02/2026, 29/02/2023).
 */
export function isValidDDMMYYYY(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  const clean = val.trim();
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  return isValidCalendarDate(year, month, day);
}

/**
 * Parses a date-only string (YYYY-MM-DD or DD/MM/YYYY) into numeric year, month (1-12), and day (1-31)
 * without timezone conversions.
 * Strictly interprets slash-separated format as DD/MM/YYYY (Day / Month / Year).
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
    if (isValidCalendarDate(year, month, day)) {
      return { year, month, day };
    }
  }

  // Format: DD/MM/YYYY (or D/M/YYYY)
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      return { year, month, day };
    }
  }

  // Format: DD-MM-YYYY (or D-M-YYYY)
  const hyphenDmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (hyphenDmyMatch) {
    const day = parseInt(hyphenDmyMatch[1], 10);
    const month = parseInt(hyphenDmyMatch[2], 10);
    const year = parseInt(hyphenDmyMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      return { year, month, day };
    }
  }

  return null;
}

/**
 * Parses a user-entered DD/MM/YYYY string into normalized database format YYYY-MM-DD.
 * Returns null if the format or calendar date is invalid.
 * 
 * Example:
 * "15/08/2026" -> "2026-08-15"
 * "02/03/2026" -> "2026-03-02" (2 March 2026)
 * "31/02/2026" -> null
 */
export function parseDDMMYYYYToISO(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string") return null;
  const clean = val.trim();
  if (!clean) return null;

  const parts = parseDateOnlyString(clean);
  if (parts) {
    const y = parts.year;
    const m = String(parts.month).padStart(2, "0");
    const d = String(parts.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Robust date normalizer for incoming data (DD/MM/YYYY, YYYY-MM-DD, ISO string, Date object).
 * Always converts to normalized YYYY-MM-DD for database persistence.
 * Strictly interprets slash formats as DD/MM/YYYY.
 */
export function parseDateToISO(val: string | Date | null | undefined): string | null {
  if (!val) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Direct date-only parser
  const parts = parseDateOnlyString(str);
  if (parts) {
    const y = parts.year;
    const m = String(parts.month).padStart(2, "0");
    const d = String(parts.day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Complex ISO strings with timestamps
  if (str.includes("T")) {
    const isoDatePart = str.split("T")[0];
    const isoParts = parseDateOnlyString(isoDatePart);
    if (isoParts) {
      const y = isoParts.year;
      const m = String(isoParts.month).padStart(2, "0");
      const d = String(isoParts.day).padStart(2, "0");
      return `${y}-${m}-${d}`;
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
 * Converts a normalized YYYY-MM-DD date string to DD/MM/YYYY for input display.
 * If input is already in DD/MM/YYYY, returns it as-is.
 */
export function formatToDDMMYYYY(val: string | null | undefined): string {
  if (!val) return "";
  const parts = parseDateOnlyString(val);
  if (!parts) return String(val);
  const dayPadded = String(parts.day).padStart(2, "0");
  const monthPadded = String(parts.month).padStart(2, "0");
  return `${dayPadded}/${monthPadded}/${parts.year}`;
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


import { parseDateOnlyString } from "@/lib/utils/date";

/**
 * Pure, reliable calendar date arithmetic functions to avoid JavaScript timezone offset anomalies.
 * Safe for use in both Client Components and Server Components.
 */
export class CalendarDateEngine {
  /**
   * Parses a YYYY-MM-DD or DD/MM/YYYY date string into a midday UTC Date to prevent day-boundary shifts.
   */
  static parseDateOnly(dateStr: string): Date {
    const cleanStr = String(dateStr).trim();
    if (!cleanStr) return new Date(NaN);
    
    const parts = parseDateOnlyString(cleanStr);
    if (parts) {
      return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
    }

    const fallback = new Date(cleanStr);
    return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate(), 12, 0, 0));
  }

  /**
   * Formats a date string into strict YYYY-MM-DD.
   */
  static toISODate(date: Date): string {
    if (isNaN(date.getTime())) return "";
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Subtracts integer days from a YYYY-MM-DD date using calendar arithmetic.
   * e.g., subtractDays('2027-08-26', 90) => '2027-05-28'
   * e.g., subtractDays('2027-08-26', 60) => '2027-06-27'
   * e.g., subtractDays('2027-08-26', 30) => '2027-07-27'
   * e.g., subtractDays('2027-08-26', 15) => '2027-08-11'
   */
  static subtractDays(dateStr: string, days: number): string {
    const d = this.parseDateOnly(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() - days);
    return this.toISODate(d);
  }

  /**
   * Adds integer days to a YYYY-MM-DD date using calendar arithmetic.
   */
  static addDays(dateStr: string, days: number): string {
    const d = this.parseDateOnly(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + days);
    return this.toISODate(d);
  }

  /**
   * Calculates difference in calendar days between targetDate and referenceDate (target - ref).
   */
  static diffCalendarDays(targetDateStr: string, refDateStr: string): number {
    const target = this.parseDateOnly(targetDateStr);
    const ref = this.parseDateOnly(refDateStr);
    if (isNaN(target.getTime()) || isNaN(ref.getTime())) return 0;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((target.getTime() - ref.getTime()) / msPerDay);
  }

  /**
   * Formats a date into a clean display format, e.g. "28 May 2027" or "26 August 2027".
   */
  static formatDateDisplay(dateStr: string | null | undefined, fullMonth = false): string {
    if (!dateStr) return "Not Available";
    const d = this.parseDateOnly(dateStr);
    if (isNaN(d.getTime())) return "Not Available";
    
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonths = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    
    const monthName = fullMonth ? fullMonths[d.getUTCMonth()] : shortMonths[d.getUTCMonth()];
    return `${d.getUTCDate()} ${monthName} ${d.getUTCFullYear()}`;
  }

  /**
   * Formats relative days remaining into human-readable text.
   * e.g. "Expires in 582 days", "Expires in 15 days", "Expires tomorrow", "Expires today", "Expired 3 days ago", "Expired yesterday"
   */
  static formatRelativeDays(daysRemaining: number | null | undefined): string {
    if (daysRemaining === null || daysRemaining === undefined || isNaN(daysRemaining)) {
      return "No expiry recorded";
    }
    if (daysRemaining < -1) {
      return `Expired ${Math.abs(daysRemaining)} days ago`;
    }
    if (daysRemaining === -1) {
      return "Expired yesterday";
    }
    if (daysRemaining === 0) {
      return "Expires today";
    }
    if (daysRemaining === 1) {
      return "Expires tomorrow";
    }
    return `Expires in ${daysRemaining} days`;
  }

  /**
   * Categorizes document expiration health for visual badge styling.
   */
  static getExpiryHealth(daysRemaining: number | null | undefined): {
    level: "healthy" | "upcoming" | "critical" | "expired" | "none";
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    colorClass: string;
    label: string;
    relativeText: string;
  } {
    if (daysRemaining === null || daysRemaining === undefined || isNaN(daysRemaining)) {
      return {
        level: "none",
        badgeVariant: "outline",
        colorClass: "text-muted-foreground border-border/60 bg-muted/20",
        label: "No Expiry Recorded",
        relativeText: "No expiry recorded"
      };
    }

    if (daysRemaining < 0) {
      const rel = daysRemaining === -1 ? "Expired yesterday" : `Expired ${Math.abs(daysRemaining)} days ago`;
      return {
        level: "expired",
        badgeVariant: "destructive",
        colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        label: "Expired",
        relativeText: rel
      };
    }

    if (daysRemaining <= 15) {
      const rel = daysRemaining === 0 ? "Expires today" : daysRemaining === 1 ? "Expires tomorrow" : `Expires in ${daysRemaining} days`;
      return {
        level: "critical",
        badgeVariant: "destructive",
        colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        label: "Critical Expiry",
        relativeText: rel
      };
    }

    if (daysRemaining <= 30) {
      return {
        level: "upcoming",
        badgeVariant: "secondary",
        colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        label: "Upcoming Expiry",
        relativeText: `Expires in ${daysRemaining} days`
      };
    }

    return {
      level: "healthy",
      badgeVariant: "secondary",
      colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      label: "Healthy / Valid",
      relativeText: `Expires in ${daysRemaining} days`
    };
  }

  /**
   * Returns current UTC date string YYYY-MM-DD.
   */
  static getTodayISO(): string {
    const now = new Date();
    return this.toISODate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)));
  }
}

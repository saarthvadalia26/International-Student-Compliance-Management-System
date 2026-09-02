/**
 * Domain Service: Academic Progression Engine
 * Authoritative system for calculating student semester progression, 
 * expected graduation dates, and managing academic adjustments.
 */

export type SemesterDurationUnit = "months" | "weeks" | "days";

export interface AcademicCourseConfig {
  programName: string;
  programCode?: string | null;
  totalSemesters: number;
  semesterDuration: number;
  semesterDurationUnit: SemesterDurationUnit | string;
}

export type AcademicAdjustmentType = 
  | "semester_override"
  | "semester_repeat"
  | "academic_leave"
  | "course_transfer"
  | "extension"
  | "admission_date_correction";

export interface AcademicAdjustmentRecord {
  id?: string;
  adjustmentType: AcademicAdjustmentType;
  effectiveDate: string; // ISO YYYY-MM-DD
  previousProgramCode?: string | null;
  newProgramCode?: string | null;
  previousSemester?: number | null;
  adjustedSemester?: number | null;
  reason: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

export type AcademicStage = "NOT_STARTED" | "ACTIVE" | "FINAL_SEMESTER" | "COMPLETED";

export interface ProgressionCalculationResult {
  currentSemester: number;
  totalSemesters: number;
  stage: AcademicStage;
  stageLabel: string;
  isCompleted: boolean;
  isFinalSemester: boolean;
  expectedGraduationDateISO: string;
  expectedGraduationFormatted: string;
  activeAdjustmentsCount: number;
  details: {
    admissionDateISO: string;
    referenceDateISO: string;
    semesterDuration: number;
    semesterDurationUnit: string;
    monthsElapsed: number;
    rawSemestersElapsed: number;
    hasOverrides: boolean;
  };
}

export class AcademicProgressionEngine {
  /**
   * Normalizes any incoming date string to strict local YYYY-MM-DD format
   */
  public static normalizeDate(val: string | Date | undefined | null): string {
    if (!val) return "";
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "";
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes("T")) return str.split("T")[0];
    const slashParts = str.split("/");
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return `${slashParts[0]}-${slashParts[1].padStart(2, "0")}-${slashParts[2].padStart(2, "0")}`;
      } else if (slashParts[2].length === 4) {
        return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
      }
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  /**
   * Formats date string into enterprise standard DD/MM/YYYY (e.g. "01/08/2025")
   */
  public static formatDisplayDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Not Recorded";
    const normalized = this.normalizeDate(dateStr);
    if (!normalized) return "Not Recorded";
    const [yStr, mStr, dStr] = normalized.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12) {
      return dateStr;
    }

    const dayPadded = String(day).padStart(2, "0");
    const monthPadded = String(month).padStart(2, "0");
    return `${dayPadded}/${monthPadded}/${year}`;
  }

  /**
   * Computes exact elapsed calendar months between two dates without rough day approximations.
   */
  public static getExactMonthsElapsed(startDateISO: string, targetDateISO: string): number {
    const startNorm = this.normalizeDate(startDateISO);
    const targetNorm = this.normalizeDate(targetDateISO);
    if (!startNorm || !targetNorm) return 0;

    const [sy, sm, sd] = startNorm.split("-").map(Number);
    const [ty, tm, td] = targetNorm.split("-").map(Number);

    if (ty < sy || (ty === sy && tm < sm) || (ty === sy && tm === sm && td < sd)) {
      return 0;
    }

    let months = (ty - sy) * 12 + (tm - sm);
    if (td < sd) {
      months--;
    }
    return Math.max(0, months);
  }

  /**
   * Adds an exact number of calendar months to a date, clamping to end of month when necessary.
   * e.g. 31 Aug 2025 + 6 months -> 28 Feb 2026 (or 29 Feb in leap year)
   */
  public static addCalendarMonths(dateISO: string, monthsToAdd: number): string {
    const norm = this.normalizeDate(dateISO);
    if (!norm) return "";
    const [y, m, d] = norm.split("-").map(Number);

    const totalMonths = m - 1 + monthsToAdd;
    const targetYear = y + Math.floor(totalMonths / 12);
    const targetMonth = (totalMonths % 12 + 12) % 12 + 1; // 1-indexed

    // Days in target month
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(d, daysInTargetMonth);

    const yStr = String(targetYear);
    const mStr = String(targetMonth).padStart(2, "0");
    const dStr = String(targetDay).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  }

  /**
   * Adds days to a date string
   */
  public static addCalendarDays(dateISO: string, daysToAdd: number): string {
    const norm = this.normalizeDate(dateISO);
    if (!norm) return "";
    const dt = new Date(norm + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + daysToAdd);
    return dt.toISOString().split("T")[0];
  }

  /**
   * Calculates the Expected Graduation / Completion Date from admission date and course structure.
   */
  public static calculateExpectedGraduationDate(params: {
    admissionDate: string;
    courseConfig: AcademicCourseConfig;
    adjustments?: AcademicAdjustmentRecord[];
  }): string {
    const { admissionDate, courseConfig, adjustments = [] } = params;
    const admISO = this.normalizeDate(admissionDate);
    if (!admISO) return "";

    const totalSemesters = Math.max(1, courseConfig.totalSemesters || 8);
    const semesterDuration = Math.max(1, courseConfig.semesterDuration || 6);
    const durationUnit = (courseConfig.semesterDurationUnit || "months").toLowerCase();

    let baseGraduationDate = "";
    if (durationUnit === "weeks") {
      baseGraduationDate = this.addCalendarDays(admISO, totalSemesters * semesterDuration * 7);
    } else if (durationUnit === "days") {
      baseGraduationDate = this.addCalendarDays(admISO, totalSemesters * semesterDuration);
    } else {
      // Default to exact calendar months
      baseGraduationDate = this.addCalendarMonths(admISO, totalSemesters * semesterDuration);
    }

    // Apply any extension adjustments
    const extensions = adjustments.filter(a => a.adjustmentType === "extension" || a.adjustmentType === "academic_leave");
    for (const ext of extensions) {
      if (ext.adjustedSemester && ext.adjustedSemester > 0) {
        if (durationUnit === "months") {
          baseGraduationDate = this.addCalendarMonths(baseGraduationDate, ext.adjustedSemester * semesterDuration);
        } else if (durationUnit === "weeks") {
          baseGraduationDate = this.addCalendarDays(baseGraduationDate, ext.adjustedSemester * semesterDuration * 7);
        }
      }
    }

    return baseGraduationDate;
  }

  /**
   * Authoritative calculation of a student's current semester and academic stage.
   */
  public static calculateProgression(params: {
    admissionDate: string;
    courseConfig: AcademicCourseConfig;
    currentDate?: string | Date;
    adjustments?: AcademicAdjustmentRecord[];
  }): ProgressionCalculationResult {
    const { admissionDate, courseConfig, adjustments = [] } = params;
    const admISO = this.normalizeDate(admissionDate);
    const refISO = this.normalizeDate(params.currentDate || new Date());

    const totalSemesters = Math.max(1, courseConfig.totalSemesters || 8);
    const semesterDuration = Math.max(1, courseConfig.semesterDuration || 6);
    const durationUnit = (courseConfig.semesterDurationUnit || "months").toLowerCase();

    const expectedGraduationDateISO = this.calculateExpectedGraduationDate({
      admissionDate: admISO,
      courseConfig,
      adjustments
    });

    if (!admISO) {
      return {
        currentSemester: 1,
        totalSemesters,
        stage: "NOT_STARTED",
        stageLabel: "Admission Date Required",
        isCompleted: false,
        isFinalSemester: false,
        expectedGraduationDateISO: "",
        expectedGraduationFormatted: "Not Recorded",
        activeAdjustmentsCount: 0,
        details: {
          admissionDateISO: "",
          referenceDateISO: refISO,
          semesterDuration,
          semesterDurationUnit: durationUnit,
          monthsElapsed: 0,
          rawSemestersElapsed: 0,
          hasOverrides: false
        }
      };
    }

    // 1. Check if admission date is in the future
    if (refISO < admISO) {
      return {
        currentSemester: 1,
        totalSemesters,
        stage: "NOT_STARTED",
        stageLabel: `Not Started (Commences ${this.formatDisplayDate(admISO)})`,
        isCompleted: false,
        isFinalSemester: false,
        expectedGraduationDateISO,
        expectedGraduationFormatted: this.formatDisplayDate(expectedGraduationDateISO),
        activeAdjustmentsCount: adjustments.length,
        details: {
          admissionDateISO: admISO,
          referenceDateISO: refISO,
          semesterDuration,
          semesterDurationUnit: durationUnit,
          monthsElapsed: 0,
          rawSemestersElapsed: 0,
          hasOverrides: false
        }
      };
    }

    // 2. Compute elapsed periods according to configured duration unit
    let rawSemestersElapsed = 0;
    let monthsElapsed = 0;

    if (durationUnit === "weeks") {
      const dtStart = new Date(admISO + "T00:00:00Z").getTime();
      const dtRef = new Date(refISO + "T00:00:00Z").getTime();
      const daysElapsed = Math.max(0, Math.floor((dtRef - dtStart) / (1000 * 60 * 60 * 24)));
      const weeksElapsed = Math.floor(daysElapsed / 7);
      rawSemestersElapsed = Math.floor(weeksElapsed / semesterDuration);
      monthsElapsed = Math.floor(daysElapsed / 30);
    } else if (durationUnit === "days") {
      const dtStart = new Date(admISO + "T00:00:00Z").getTime();
      const dtRef = new Date(refISO + "T00:00:00Z").getTime();
      const daysElapsed = Math.max(0, Math.floor((dtRef - dtStart) / (1000 * 60 * 60 * 24)));
      rawSemestersElapsed = Math.floor(daysElapsed / semesterDuration);
      monthsElapsed = Math.floor(daysElapsed / 30);
    } else {
      // Default: Calendar months
      monthsElapsed = this.getExactMonthsElapsed(admISO, refISO);
      rawSemestersElapsed = Math.floor(monthsElapsed / semesterDuration);
    }

    let calculatedSemester = rawSemestersElapsed + 1;
    let hasOverrides = false;

    // 3. Process applicable adjustments in chronological order
    const applicableAdjustments = [...adjustments]
      .filter(a => this.normalizeDate(a.effectiveDate) <= refISO)
      .sort((a, b) => this.normalizeDate(a.effectiveDate).localeCompare(this.normalizeDate(b.effectiveDate)));

    for (const adj of applicableAdjustments) {
      if (adj.adjustmentType === "semester_override" && adj.adjustedSemester && adj.adjustedSemester > 0) {
        // Calculate elapsed semesters since the effective date of this override
        const overrideMonthsElapsed = durationUnit === "months" 
          ? this.getExactMonthsElapsed(adj.effectiveDate, refISO)
          : 0;
        const semestersSinceOverride = Math.floor(overrideMonthsElapsed / semesterDuration);
        calculatedSemester = adj.adjustedSemester + semestersSinceOverride;
        hasOverrides = true;
      } else if (adj.adjustmentType === "semester_repeat") {
        // Repeated semester shifts progression by -1
        calculatedSemester = Math.max(1, calculatedSemester - 1);
        hasOverrides = true;
      }
    }

    // 4. Determine stage and clamped semester bounds
    const isCompleted = calculatedSemester > totalSemesters;
    const clampedSemester = Math.min(Math.max(1, calculatedSemester), totalSemesters);
    const isFinalSemester = clampedSemester === totalSemesters && !isCompleted;

    let stage: AcademicStage = "ACTIVE";
    let stageLabel = `Semester ${clampedSemester} of ${totalSemesters}`;

    if (isCompleted) {
      stage = "COMPLETED";
      stageLabel = `Program Completed (Final: Semester ${totalSemesters})`;
    } else if (isFinalSemester) {
      stage = "FINAL_SEMESTER";
      stageLabel = `Final Semester (Semester ${totalSemesters} of ${totalSemesters})`;
    }

    return {
      currentSemester: clampedSemester,
      totalSemesters,
      stage,
      stageLabel,
      isCompleted,
      isFinalSemester,
      expectedGraduationDateISO,
      expectedGraduationFormatted: this.formatDisplayDate(expectedGraduationDateISO),
      activeAdjustmentsCount: applicableAdjustments.length,
      details: {
        admissionDateISO: admISO,
        referenceDateISO: refISO,
        semesterDuration,
        semesterDurationUnit: durationUnit,
        monthsElapsed,
        rawSemestersElapsed,
        hasOverrides
      }
    };
  }
}

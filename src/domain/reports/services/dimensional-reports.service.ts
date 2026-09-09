import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCountryByCode } from "@/utils/countries";
import { parseDateOnlyString } from "@/lib/utils/date";
import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";
import {
  DimensionalReportsData,
  DimensionReportFilters,
  DimensionFilterOptions,
  DimensionRow,
  DocumentStatusMetricRow,
  RenewalMetricRow,
} from "../types/dimensional-reports";

export class DimensionalReportsService {
  /**
   * Retrieves unified multi-dimensional student analytics and reporting data
   * from authoritative PostgreSQL database tables with global filter application.
   */
  async getDimensionalReports(filters: DimensionReportFilters = {}): Promise<DimensionalReportsData> {
    const supabase = getAdminSupabase();

    // 1. Fetch all active and non-deleted students with joined personal, academic, and snapshot data
    const [
      studentsRes,
      programsRes,
      schoolsRes,
      campusesRes,
      pRenewalsRes,
      vRenewalsRes,
      eRenewalsRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select(`
          id,
          status,
          registration_number,
          created_at,
          student_personal (
            full_name,
            nationality_code,
            gender
          ),
          student_academic (
            program_id,
            program_code,
            admission_category,
            admission_academic_year,
            admission_date,
            fee_payment_category,
            iccr_scholarship_scheme_name,
            nfsu_campus
          ),
          student_snapshot (
            passport_number,
            passport_expiry,
            passport_status,
            visa_number,
            visa_expiry,
            visa_status,
            efrro_number,
            efrro_expiry,
            efrro_status,
            compliance_status
          )
        `)
        .is("deleted_at", null),

      // Lookup: Academic Programs
      supabase
        .from("academic_programs")
        .select("id, program_name, program_code, school_id, school_name, academic_level")
        .eq("is_active", true),

      // Lookup: Schools
      supabase
        .from("schools")
        .select("id, name, code")
        .eq("is_active", true),

      // Lookup: Campuses
      supabase
        .from("campuses")
        .select("id, name, code")
        .eq("is_active", true),

      // Authoritative Renewals: Strictly version_number > 1
      supabase
        .from("passport_versions")
        .select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null),

      supabase
        .from("visa_versions")
        .select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null),

      supabase
        .from("efrro_versions")
        .select("id", { count: "exact", head: true })
        .gt("version_number", 1)
        .is("deleted_at", null),
    ]);

    if (studentsRes.error) {
      throw new Error(`Failed to load student registry for reports: ${studentsRes.error.message}`);
    }

    const rawStudents = (studentsRes.data || []) as any[];
    const programs = (programsRes.data || []) as any[];
    const schools = (schoolsRes.data || []) as any[];
    const campuses = (campusesRes.data || []) as any[];

    const programMap = new Map<string, any>();
    programs.forEach((p) => {
      programMap.set(p.id, p);
      if (p.program_code) programMap.set(p.program_code, p);
    });

    const schoolMap = new Map<string, any>();
    schools.forEach((s) => {
      schoolMap.set(s.id, s);
      if (s.name) schoolMap.set(s.name, s);
    });

    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Helper: calculate integer days remaining from YYYY-MM-DD
    const calcDays = (expStr?: string | null): number | null => {
      if (!expStr) return null;
      const parts = parseDateOnlyString(String(expStr));
      if (!parts) {
        const d = new Date(expStr);
        if (isNaN(d.getTime())) return null;
        const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
      }
      const target = new Date(parts.year, parts.month - 1, parts.day).getTime();
      return Math.round((target - todayTime) / (1000 * 60 * 60 * 24));
    };

    // 2. Flatten and normalize each student record (distinct 1 student = 1 item)
    interface ProcessedStudent {
      id: string;
      status: string;
      fullName: string;
      nationalityCode: string;
      countryName: string;
      campus: string;
      category: string;
      categoryDisplay: string;
      programId: string;
      programName: string;
      programCode: string;
      degreeLevel: string;
      schoolId: string;
      schoolName: string;
      fundingType: string;
      fundingDisplay: string;
      fundingSubLabel?: string;
      academicYear: string;
      complianceStatus: string;
      passportDays: number | null;
      passportValid: boolean;
      visaDays: number | null;
      visaValid: boolean;
      efrroDays: number | null;
      efrroValid: boolean;
    }

    function parseScholarshipScheme(rawScheme?: string | null): { code: string; subLabel: string } {
      if (!rawScheme) return { code: "ICCR-SCHOLARSHIP", subLabel: "ICCR Scholarship" };
      const cleaned = rawScheme.replace(/^"|"$/g, "").trim();
      const lower = cleaned.toLowerCase();

      if (lower.includes("africa")) {
        return { code: "ICCR-AFRICA", subLabel: cleaned };
      } else if (lower.includes("suborno")) {
        return { code: "ICCR-SUBORNO", subLabel: cleaned };
      } else if (lower.includes("atal") || lower.includes("abvgss") || lower.includes("general scholarship")) {
        return { code: "ICCR-ABVGSS", subLabel: cleaned };
      } else if (lower.includes("sushma") || lower.includes("silver jubilee")) {
        return { code: "ICCR-SUSHMA", subLabel: cleaned };
      } else if (lower.includes("mekong")) {
        return { code: "ICCR-MEKONG", subLabel: cleaned };
      } else if (lower.includes("ambedkar") || lower.includes("bhutan")) {
        return { code: "ICCR-AMBEDKAR", subLabel: cleaned };
      } else if (lower.includes("kushok") || lower.includes("mongolia")) {
        return { code: "ICCR-KUSHOK", subLabel: cleaned };
      } else if (lower.includes("radhakrishnan") || lower.includes("cultural exchange")) {
        return { code: "ICCR-RADHAKRISHNAN", subLabel: cleaned };
      } else if (lower.includes("maldives")) {
        return { code: "ICCR-MALDIVES", subLabel: cleaned };
      }

      const matchParen = cleaned.match(/\(([A-Z0-9\s-]+)\)/);
      if (matchParen && matchParen[1] && matchParen[1].length <= 10) {
        return { code: `ICCR-${matchParen[1].trim()}`, subLabel: cleaned };
      }

      return { code: cleaned.slice(0, 18).toUpperCase(), subLabel: cleaned };
    }

    const processedStudents: ProcessedStudent[] = rawStudents.map((st) => {
      const personal = Array.isArray(st.student_personal) ? st.student_personal[0] : st.student_personal;
      const academic = Array.isArray(st.student_academic) ? st.student_academic[0] : st.student_academic;
      const snapshot = Array.isArray(st.student_snapshot) ? st.student_snapshot[0] : st.student_snapshot;

      const natCode = (personal?.nationality_code || "").trim().toUpperCase();
      const countryMeta = natCode ? getCountryByCode(natCode) : null;
      const countryName = countryMeta ? countryMeta.name : natCode ? natCode : "Not Specified";

      // Campus
      const campus = (academic?.nfsu_campus || "").trim() || "Not Specified";

      // Category
      const rawCat = (academic?.admission_category || "").trim().toLowerCase();
      let categoryDisplay = "Not Specified";
      if (rawCat === "iccr") categoryDisplay = "ICCR";
      else if (rawCat === "sii") categoryDisplay = "SII";
      else if (rawCat === "direct") categoryDisplay = "Direct";
      else if (rawCat === "foreign_govt_sponsored" || rawCat === "foreign_govt" || rawCat === "govt_sponsored") categoryDisplay = "Foreign Govt. Sponsored";
      else if (rawCat === "other") categoryDisplay = academic?.admission_category_other?.trim() ? `Other (${academic.admission_category_other.trim()})` : "Other";
      else if (rawCat === "self_financed" || rawCat === "self") categoryDisplay = "Self Financed";
      else if (rawCat) categoryDisplay = rawCat.toUpperCase();

      // Program & School
      const prog = academic?.program_id ? programMap.get(academic.program_id) : (academic?.program_code ? programMap.get(academic.program_code) : null);
      const programName = prog?.program_name || academic?.program_code || "Not Specified";
      const programCode = prog?.program_code || academic?.program_code || "";
      const degreeLevel = prog?.academic_level || "Not Specified";
      const schoolName = prog?.school_name || "Not Specified";
      const schoolId = prog?.school_id || "";

      // Funding
      const rawFunding = (academic?.fee_payment_category || "").trim().toLowerCase();
      let fundingDisplay = "Not Specified";
      let fundingSubLabel: string | undefined = undefined;

      if (rawFunding === "scholarship") {
        if (academic?.iccr_scholarship_scheme_name) {
          const parsed = parseScholarshipScheme(academic.iccr_scholarship_scheme_name);
          fundingDisplay = parsed.code;
          fundingSubLabel = parsed.subLabel;
        } else {
          fundingDisplay = "ICCR-SCHOLARSHIP";
          fundingSubLabel = "ICCR Scholarship Scheme";
        }
      } else if (rawFunding === "self_financed" || rawFunding === "self") {
        fundingDisplay = "Self Financed";
      } else if (rawFunding) {
        fundingDisplay = rawFunding.replace(/_/g, " ").toUpperCase();
      }

      // Academic Year
      const rawYear = (academic?.admission_academic_year || "").trim();
      let academicYear = "Not Specified";
      if (rawYear) {
        academicYear = rawYear.includes("-") || rawYear.includes("–") ? rawYear : `${rawYear}`;
      } else if (academic?.admission_date) {
        academicYear = String(new Date(academic.admission_date).getFullYear());
      } else if (st.created_at) {
        academicYear = String(new Date(st.created_at).getFullYear());
      }

      // Status
      const rawStatus = (st.status || "active").trim().toLowerCase();
      const status = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "Active";

      // Compliance Engine Evaluation (Authoritative Positive Compliance Rule)
      const isEfrroApp = isEfrroApplicable(natCode);
      const pDays = calcDays(snapshot?.passport_expiry);
      const vDays = calcDays(snapshot?.visa_expiry);
      const eDays = isEfrroApp ? calcDays(snapshot?.efrro_expiry) : null;

      const pNum = (snapshot?.passport_number || "").trim();
      const vNum = (snapshot?.visa_number || "").trim();
      const eNum = isEfrroApp ? (snapshot?.efrro_number || "").trim() : "";

      const pHasValidData = Boolean(pNum && snapshot?.passport_expiry && pDays !== null);
      const vHasValidData = Boolean(vNum && snapshot?.visa_expiry && vDays !== null);
      const eHasValidData = isEfrroApp ? Boolean(eNum && snapshot?.efrro_expiry && eDays !== null) : true;

      let calculatedCompliance = "Action Required / Missing Document";
      const hasExpired = (pDays !== null && pDays < 0) || (vDays !== null && vDays < 0) || (eDays !== null && eDays < 0);
      const hasCritical = (pDays !== null && pDays >= 0 && pDays <= 15) || (vDays !== null && vDays >= 0 && vDays <= 15) || (eDays !== null && eDays >= 0 && eDays <= 15);
      const hasWarning = (pDays !== null && pDays > 15 && pDays <= 30) || (vDays !== null && vDays > 15 && vDays <= 30) || (eDays !== null && eDays > 15 && eDays <= 30);

      if (hasExpired) {
        calculatedCompliance = "Expired";
      } else if (hasCritical) {
        calculatedCompliance = "Critical (0–15d)";
      } else if (hasWarning) {
        calculatedCompliance = "Warning (16–30d)";
      } else if (pHasValidData && vHasValidData && eHasValidData && !hasExpired && !hasCritical && !hasWarning) {
        calculatedCompliance = "Fully Compliant";
      } else {
        calculatedCompliance = "Action Required / Missing Document";
      }

      return {
        id: st.id,
        status,
        fullName: personal?.full_name || "Unknown Student",
        nationalityCode: natCode,
        countryName,
        campus,
        category: rawCat,
        categoryDisplay,
        programId: academic?.program_id || "",
        programName,
        programCode,
        degreeLevel,
        schoolId,
        schoolName,
        fundingType: rawFunding,
        fundingDisplay,
        fundingSubLabel,
        academicYear,
        complianceStatus: calculatedCompliance,
        passportDays: pDays,
        passportValid: pHasValidData,
        visaDays: vDays,
        visaValid: vHasValidData,
        efrroDays: eDays,
        efrroValid: eHasValidData,
      };
    });

    // 3. Collect Filter Dropdown Options across the entire dataset
    const academicYearsSet = new Set<string>();
    const campusesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const fundingTypesSet = new Set<string>();
    const studentStatusesSet = new Set<string>();
    const countriesMap = new Map<string, string>();
    const schoolsMap = new Map<string, string>();
    const programsMap = new Map<string, { id: string; name: string; code?: string; schoolId?: string }>();

    processedStudents.forEach((s) => {
      if (s.academicYear && s.academicYear !== "Not Specified") academicYearsSet.add(s.academicYear);
      if (s.campus && s.campus !== "Not Specified") campusesSet.add(s.campus);
      if (s.categoryDisplay && s.categoryDisplay !== "Not Specified") categoriesSet.add(s.categoryDisplay);
      if (s.fundingDisplay && s.fundingDisplay !== "Not Specified") fundingTypesSet.add(s.fundingDisplay);
      if (s.status) studentStatusesSet.add(s.status);
      if (s.nationalityCode && s.countryName !== "Not Specified") {
        countriesMap.set(s.nationalityCode, s.countryName);
      }
      if (s.schoolName && s.schoolName !== "Not Specified") {
        schoolsMap.set(s.schoolId || s.schoolName, s.schoolName);
      }
      if (s.programName && s.programName !== "Not Specified") {
        programsMap.set(s.programId || s.programName, {
          id: s.programId || s.programName,
          name: s.programName,
          code: s.programCode,
          schoolId: s.schoolId,
        });
      }
    });

    const filterOptions: DimensionFilterOptions = {
      academicYears: Array.from(academicYearsSet).sort().reverse(),
      campuses: Array.from(campusesSet).sort(),
      categories: Array.from(categoriesSet).sort(),
      schools: Array.from(schoolsMap.entries()).map(([id, name]) => ({ id, name })),
      programs: Array.from(programsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      fundingTypes: Array.from(fundingTypesSet).sort(),
      studentStatuses: Array.from(studentStatusesSet).sort(),
      countries: Array.from(countriesMap.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      complianceStatuses: [
        "Fully Compliant",
        "Warning (16–30d)",
        "Critical (0–15d)",
        "Expired",
        "Action Required / Missing Document",
      ],
    };

    // 4. Apply Global Filters
    const filteredStudents = processedStudents.filter((s) => {
      if (filters.academicYear && s.academicYear !== filters.academicYear) return false;
      if (filters.campus && s.campus !== filters.campus) return false;
      if (filters.category && s.categoryDisplay !== filters.category) return false;
      if (filters.schoolId && s.schoolId !== filters.schoolId && s.schoolName !== filters.schoolId) return false;
      if (filters.programId && s.programId !== filters.programId && s.programName !== filters.programId) return false;
      if (filters.fundingType && s.fundingDisplay !== filters.fundingType) return false;
      if (filters.studentStatus && s.status !== filters.studentStatus) return false;
      if (filters.countryCode && s.nationalityCode !== filters.countryCode) return false;
      if (filters.complianceStatus && s.complianceStatus !== filters.complianceStatus) return false;
      return true;
    });

    const totalFiltered = filteredStudents.length;

    // Helper: calculate percentage with 2 decimal precision
    const calcPct = (count: number) => {
      if (totalFiltered === 0) return 0;
      return Number(((count / totalFiltered) * 100).toFixed(2));
    };

    // 5. Aggregate Dimension 1: Country-wise
    const countryMap = new Map<string, { label: string; code: string; count: number }>();
    filteredStudents.forEach((s) => {
      const key = s.countryName;
      const existing = countryMap.get(key) || { label: key, code: s.nationalityCode, count: 0 };
      existing.count++;
      countryMap.set(key, existing);
    });

    const countryReport: DimensionRow[] = Array.from(countryMap.entries())
      .map(([key, data]) => ({
        key,
        label: data.label,
        subLabel: data.code,
        studentCount: data.count,
        percentage: calcPct(data.count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount || a.label.localeCompare(b.label));

    // 6. Aggregate Dimension 2: Category-wise
    const categoryMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.categoryDisplay;
      categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
    });

    const categoryReport: DimensionRow[] = Array.from(categoryMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 7. Aggregate Dimension 3: Academic School-wise
    const schoolAggMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.schoolName;
      schoolAggMap.set(key, (schoolAggMap.get(key) || 0) + 1);
    });

    const schoolReport: DimensionRow[] = Array.from(schoolAggMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 8. Aggregate Dimension 4: Academic Program-wise
    const programAggMap = new Map<string, { label: string; code: string; level: string; count: number }>();
    filteredStudents.forEach((s) => {
      const key = s.programName;
      const existing = programAggMap.get(key) || {
        label: key,
        code: s.programCode,
        level: s.degreeLevel,
        count: 0,
      };
      existing.count++;
      programAggMap.set(key, existing);
    });

    const programReport: DimensionRow[] = Array.from(programAggMap.entries())
      .map(([key, data]) => ({
        key,
        label: data.label,
        subLabel: data.code ? `${data.code} (${data.level})` : data.level,
        studentCount: data.count,
        percentage: calcPct(data.count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 9. Aggregate Dimension 5: Scholarship / Funding Type-wise
    const fundingMap = new Map<string, { count: number; subLabel?: string }>();
    filteredStudents.forEach((s) => {
      const key = s.fundingDisplay;
      const existing = fundingMap.get(key) || { count: 0, subLabel: s.fundingSubLabel };
      existing.count++;
      fundingMap.set(key, existing);
    });

    const fundingReport: DimensionRow[] = Array.from(fundingMap.entries())
      .map(([key, data]) => ({
        key,
        label: key,
        subLabel: data.subLabel,
        studentCount: data.count,
        percentage: calcPct(data.count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 10. Aggregate Dimension 6: Campus-wise
    const campusMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.campus;
      campusMap.set(key, (campusMap.get(key) || 0) + 1);
    });

    const campusReport: DimensionRow[] = Array.from(campusMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 11. Aggregate Dimension 7: Academic Year-wise
    const yearMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.academicYear;
      yearMap.set(key, (yearMap.get(key) || 0) + 1);
    });

    const academicYearReport: DimensionRow[] = Array.from(yearMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => b.label.localeCompare(a.label));

    // 12. Aggregate Dimension 8: Student Status-wise
    const statusMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.status;
      statusMap.set(key, (statusMap.get(key) || 0) + 1);
    });

    const studentStatusReport: DimensionRow[] = Array.from(statusMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // 13. Aggregate Dimension 9: Compliance-wise (Fail-closed positive compliance)
    const complianceMap = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const key = s.complianceStatus;
      complianceMap.set(key, (complianceMap.get(key) || 0) + 1);
    });

    const complianceReport: DimensionRow[] = Array.from(complianceMap.entries())
      .map(([key, count]) => ({
        key,
        label: key,
        studentCount: count,
        percentage: calcPct(count),
      }))
      .sort((a, b) => {
        const order = [
          "Fully Compliant",
          "Warning (16–30d)",
          "Critical (0–15d)",
          "Expired",
          "Action Required / Missing Document",
        ];
        return order.indexOf(a.label) - order.indexOf(b.label);
      });

    // 14. Aggregate Dimension 10: Document Status & Renewals
    const docStatusStats = {
      passport: { totalWithDoc: 0, valid: 0, expiring: 0, critical: 0, expired: 0, missing: 0 },
      visa: { totalWithDoc: 0, valid: 0, expiring: 0, critical: 0, expired: 0, missing: 0 },
      efrro: { totalWithDoc: 0, valid: 0, expiring: 0, critical: 0, expired: 0, missing: 0 },
    };

    filteredStudents.forEach((s) => {
      // Passport
      if (s.passportValid && s.passportDays !== null) {
        docStatusStats.passport.totalWithDoc++;
        if (s.passportDays < 0) docStatusStats.passport.expired++;
        else if (s.passportDays <= 15) docStatusStats.passport.critical++;
        else if (s.passportDays <= 30) docStatusStats.passport.expiring++;
        else docStatusStats.passport.valid++;
      } else {
        docStatusStats.passport.missing++;
      }

      // Visa
      if (s.visaValid && s.visaDays !== null) {
        docStatusStats.visa.totalWithDoc++;
        if (s.visaDays < 0) docStatusStats.visa.expired++;
        else if (s.visaDays <= 15) docStatusStats.visa.critical++;
        else if (s.visaDays <= 30) docStatusStats.visa.expiring++;
        else docStatusStats.visa.valid++;
      } else {
        docStatusStats.visa.missing++;
      }

      // eFRRO (only if applicable to student nationality)
      const isEfrroApp = isEfrroApplicable(s.nationalityCode);
      if (isEfrroApp) {
        if (s.efrroValid && s.efrroDays !== null) {
          docStatusStats.efrro.totalWithDoc++;
          if (s.efrroDays < 0) docStatusStats.efrro.expired++;
          else if (s.efrroDays <= 15) docStatusStats.efrro.critical++;
          else if (s.efrroDays <= 30) docStatusStats.efrro.expiring++;
          else docStatusStats.efrro.valid++;
        } else {
          docStatusStats.efrro.missing++;
        }
      }
    });

    const documentStatusReport: DocumentStatusMetricRow[] = [
      {
        documentType: "Passport",
        totalWithDoc: docStatusStats.passport.totalWithDoc,
        validCount: docStatusStats.passport.valid,
        expiringCount: docStatusStats.passport.expiring,
        criticalCount: docStatusStats.passport.critical,
        expiredCount: docStatusStats.passport.expired,
        missingCount: docStatusStats.passport.missing,
      },
      {
        documentType: "Visa",
        totalWithDoc: docStatusStats.visa.totalWithDoc,
        validCount: docStatusStats.visa.valid,
        expiringCount: docStatusStats.visa.expiring,
        criticalCount: docStatusStats.visa.critical,
        expiredCount: docStatusStats.visa.expired,
        missingCount: docStatusStats.visa.missing,
      },
      {
        documentType: "eFRRO",
        totalWithDoc: docStatusStats.efrro.totalWithDoc,
        validCount: docStatusStats.efrro.valid,
        expiringCount: docStatusStats.efrro.expiring,
        criticalCount: docStatusStats.efrro.critical,
        expiredCount: docStatusStats.efrro.expired,
        missingCount: docStatusStats.efrro.missing,
      },
    ];

    // Document Renewals: Strictly version_number > 1
    const pRen = pRenewalsRes.count || 0;
    const vRen = vRenewalsRes.count || 0;
    const eRen = eRenewalsRes.count || 0;

    const renewalReport: RenewalMetricRow[] = [
      { documentType: "Passport", renewalCount: pRen },
      { documentType: "Visa", renewalCount: vRen },
      { documentType: "eFRRO", renewalCount: eRen },
    ];

    // Overview KPIs
    const fullyCompliantCount = filteredStudents.filter((s) => s.complianceStatus === "Fully Compliant").length;
    const totalRenewalsCount = pRen + vRen + eRen;

    return {
      filters,
      filterOptions,
      overview: {
        totalStudents: totalFiltered,
        totalCountries: countryReport.filter((c) => c.key !== "Not Specified").length,
        totalCampuses: campusReport.filter((c) => c.key !== "Not Specified").length,
        totalSchools: schoolReport.filter((c) => c.key !== "Not Specified").length,
        totalPrograms: programReport.filter((c) => c.key !== "Not Specified").length,
        totalFullyCompliant: fullyCompliantCount,
        totalRenewals: totalRenewalsCount,
      },
      reports: {
        country: countryReport,
        category: categoryReport,
        school: schoolReport,
        program: programReport,
        funding: fundingReport,
        campus: campusReport,
        academicYear: academicYearReport,
        studentStatus: studentStatusReport,
        compliance: complianceReport,
        documentStatus: documentStatusReport,
        renewals: renewalReport,
      },
    };
  }
}

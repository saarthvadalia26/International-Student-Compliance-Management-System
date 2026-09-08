"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { DashboardMetrics } from "@/domain/reports/types";
import { SupabaseReportRepository } from "@/domain/reports/repositories/report.repository";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";
import { DEFAULT_FALLBACK_SCHOOLS } from "@/domain/schools/school.service";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { parseDateOnlyString } from "@/lib/utils/date";
import { 
  aggregateMonthlyAdmissions, 
  aggregateEfrroExpiryTimeline 
} from "@/domain/reports/utils/admissions-distribution";

const reportRepo = new SupabaseReportRepository();

// =====================================================================
// Cached Dashboard Metrics (revalidates every 60 seconds)
// =====================================================================
const getCachedDashboardMetrics = unstable_cache(
  async (): Promise<DashboardMetrics> => {
    return reportRepo.getDashboardMetrics();
  },
  ["dashboard-metrics"],
  { revalidate: 60, tags: ["dashboard-metrics"] }
);

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return getCachedDashboardMetrics();
}

export async function fetchDashboardDrilldownAction(
  category: import("@/domain/reports/types").ComplianceDrilldownCategory
): Promise<import("@/domain/reports/types").ComplianceDrilldownResponse> {
  return reportRepo.getDashboardDrilldown(category);
}

// =====================================================================
// Cached Analytics Charts (revalidates every 60 seconds)
// =====================================================================
const getCachedAnalyticsCharts = unstable_cache(
  async () => {
    return _fetchAnalyticsChartsInternal();
  },
  ["dashboard-analytics-charts"],
  { revalidate: 60, tags: ["dashboard-charts"] }
);

export async function fetchAnalyticsCharts() {
  try {
    return await getCachedAnalyticsCharts();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("incrementalCache missing")) {
      return _fetchAnalyticsChartsInternal();
    }
    throw err;
  }
}

/**
 * Uncached server action for immediate, live client consumption.
 * Fetches authoritative aggregation directly from PostgreSQL without cache delay.
 */
export async function fetchAnalyticsChartsLive() {
  return _fetchAnalyticsChartsInternal();
}

/**
 * Invalidate Next.js cache for dashboard charts and metrics upon database mutations.
 */
export async function revalidateDashboardData() {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard", "page");
    revalidateTag("dashboard-charts", { expire: 0 });
    revalidateTag("dashboard-metrics", { expire: 0 });
  } catch (err) {
    console.warn("[REVALIDATE_WARN] Failed to invalidate dashboard cache tags:", err);
  }
}

// Internal (uncached) implementation
export async function _fetchAnalyticsChartsInternal(): Promise<import("@/features/dashboard/charts/percentage-charts").DashboardChartsData> {
  const supabase = getAdminSupabase();

  // Execute ALL queries in parallel (including reference_data, campuses, and academic_programs)
  const [
    studentsRes,
    snapshotRes,
    notificationsRes,
    refDataRes,
    academicProgramsRes,
    schoolsRes,
    campusesRes
  ] = await Promise.all([
    // 1. Authoritative active student records with personal and academic associations
    supabase
      .from("students")
      .select(`
        id,
        created_at,
        status,
        student_personal(nationality_code, full_name),
        student_academic(program_id, program_code, admission_date, nfsu_campus, override_school_id)
      `)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .then(async (res) => {
        if (res.error && (res.error.message.includes("override_school_id") || res.error.message.includes("nfsu_campus"))) {
          return supabase
            .from("students")
            .select(`
              id,
              created_at,
              status,
              student_personal(nationality_code, full_name),
              student_academic(program_id, program_code, admission_date)
            `)
            .is("deleted_at", null)
            .eq("status", "active")
            .order("created_at", { ascending: true });
        }
        return res;
      }),
    // 2. Group by compliance and document expiries (active, non-deleted students only)
    supabase
      .from("student_snapshot")
      .select("compliance_status, passport_number, passport_expiry, visa_number, visa_expiry, efrro_number, efrro_expiry, passport_status, visa_status, efrro_status, students!inner(id, status, deleted_at)")
      .is("students.deleted_at", null)
      .eq("students.status", "active"),
    // 3. Group by notification statuses
    supabase.from(NOTIFICATION_TABLE_NAME).select("status"),
    // 4. Reference data
    supabase.from("reference_data").select("code, display_name, category"),
    // 5. Canonical academic programs master data
    supabase.from("academic_programs").select("id, program_name, program_code, school_name, academic_level"),
    // 6. Canonical schools master data (fallback to default if pending migration)
    supabase.from("schools").select("id, name, code").then((res) => {
      if (res.error) {
        return { data: DEFAULT_FALLBACK_SCHOOLS, error: null };
      }
      return res;
    }),
    // 7. Canonical campuses master data (fallback to empty if pending migration)
    supabase.from("campuses").select("id, name, code, location, is_active").then((res) => {
      if (res.error) {
        return { data: [], error: null };
      }
      return res;
    })
  ]);

  if (studentsRes.error) throw new Error(`[DB_QUERY_FAILED] ${studentsRes.error.message}`);
  if (snapshotRes.error) throw new Error(`[DB_QUERY_FAILED] ${snapshotRes.error.message}`);
  if (notificationsRes.error) throw new Error(`[DB_QUERY_FAILED] ${notificationsRes.error.message}`);

  const activeStudents = (studentsRes.data || []) as any[];
  const totalActiveStudents = activeStudents.length;
  const notifRows = notificationsRes.data || [];

  // 1. Build Reference Data Lookup Map
  const refMap: Record<string, string> = {};
  if (refDataRes.data) {
    refDataRes.data.forEach(r => {
      refMap[r.code] = r.display_name;
      refMap[r.code.toUpperCase()] = r.display_name;
    });
  }

  // 2. Build ISO Country Lookup Map (with flags & alpha codes)
  const countryCodeMap: Record<string, { name: string; flag: string; isoAlpha2: string; isoAlpha3: string }> = {};
  const { ISO_MASTER_COUNTRIES } = await import("@/domain/countries/iso-countries.data");
  ISO_MASTER_COUNTRIES.forEach(c => {
    const meta = {
      name: c.name,
      flag: c.flag || "",
      isoAlpha2: (c.isoAlpha2 || "").toUpperCase(),
      isoAlpha3: (c.isoAlpha3 || "").toUpperCase()
    };
    if (c.isoAlpha2) countryCodeMap[c.isoAlpha2.toUpperCase()] = meta;
    if (c.isoAlpha3) countryCodeMap[c.isoAlpha3.toUpperCase()] = meta;
    if (c.name) countryCodeMap[c.name.trim().toUpperCase()] = meta;
  });

  // 3. Build Canonical Academic Programs Map
  const { DEFAULT_FALLBACK_PROGRAMS, LEGACY_PROGRAM_ALIASES } = await import("@/domain/academic-programs/academic-program.service");
  const { getAcademicLevelLabel } = await import("@/domain/academic-programs/academic-level");

  interface ProgramMeta {
    id: string;
    name: string;
    code?: string;
    school?: string;
    level?: string;
  }

  const programMap: Record<string, ProgramMeta> = {};
  const normalizedNameMap: Record<string, ProgramMeta> = {};

  function normalizeProgName(n: string): string {
    return n.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  const allProgramsSource = (academicProgramsRes.data && academicProgramsRes.data.length > 0)
    ? academicProgramsRes.data.map(p => ({
        id: p.id,
        programName: p.program_name,
        programCode: p.program_code,
        schoolName: p.school_name,
        academicLevel: p.academic_level
      }))
    : DEFAULT_FALLBACK_PROGRAMS;

  allProgramsSource.forEach(p => {
    const code = (p.programCode || "").trim();
    const name = (p.programName || "").trim();
    const school = (p.schoolName || "General Academic Faculty").trim();
    const level = (p.academicLevel || "Other").trim();
    const meta: ProgramMeta = { id: p.id, name, code: code || undefined, school, level };

    if (p.id) {
      programMap[p.id.toLowerCase()] = meta;
      programMap[p.id.toUpperCase()] = meta;
    }
    if (code) {
      programMap[code.toLowerCase()] = meta;
      programMap[code.toUpperCase()] = meta;
      programMap[code.replace(/_/g, "-").toLowerCase()] = meta;
      programMap[code.replace(/_/g, "-").toUpperCase()] = meta;
      programMap[code.replace(/-/g, "_").toLowerCase()] = meta;
      programMap[code.replace(/-/g, "_").toUpperCase()] = meta;
    }
    if (name) {
      programMap[name.toLowerCase()] = meta;
      programMap[name.toUpperCase()] = meta;
      normalizedNameMap[normalizeProgName(name)] = meta;
    }
  });

  // Also index known legacy aliases into programMap
  Object.entries(LEGACY_PROGRAM_ALIASES).forEach(([alias, targetCode]) => {
    const targetMeta = programMap[targetCode.toUpperCase()];
    if (targetMeta) {
      programMap[alias.toLowerCase()] = targetMeta;
      programMap[alias.toUpperCase()] = targetMeta;
    }
  });

  // 4. Build Canonical Schools Lookup Map
  const schoolsMap: Record<string, string> = {};
  const schoolsCodeMap: Record<string, string> = {};
  if (schoolsRes.data) {
    schoolsRes.data.forEach(s => {
      schoolsMap[s.id] = s.name;
      if (s.code) {
        schoolsCodeMap[s.name] = s.code;
        schoolsCodeMap[s.id] = s.code;
      }
    });
  }

  // 5. Build Canonical Campuses Lookup Map
  const campusesMap: Record<string, { name: string; code?: string; location?: string }> = {};
  if (campusesRes.data) {
    campusesRes.data.forEach((c: any) => {
      const meta = { name: c.name, code: c.code || undefined, location: c.location || undefined };
      campusesMap[c.name.trim().toLowerCase()] = meta;
      if (c.code) campusesMap[c.code.trim().toLowerCase()] = meta;
      if (c.id) campusesMap[c.id.toLowerCase()] = meta;
    });
  }

  // =========================================================================
  // Aggregation Process: Guarantee 100% Student Reconciliation
  // =========================================================================
  const countryCounts: Record<string, { count: number; code: string; flag: string; label: string }> = {};
  const schoolCounts: Record<string, { count: number; code?: string }> = {};
  const programCounts: Record<string, { count: number; code?: string; level?: string; school?: string }> = {};
  const campusCounts: Record<string, { count: number; code?: string; location?: string }> = {};

  // Hierarchy structure: School -> Level -> Course -> count & code
  const hierarchyMap: Record<string, {
    schoolCode?: string;
    levels: Record<string, {
      courses: Record<string, { count: number; code?: string }>
    }>
  }> = {};

  activeStudents.forEach(student => {
    // --- 1. Country / Nationality Resolution ---
    const personal = Array.isArray(student.student_personal)
      ? student.student_personal[0]
      : student.student_personal;

    const rawCountryCode = (personal?.nationality_code || "").trim().toUpperCase();
    let countryName = "Unknown / Not Provided";
    let countryIso = "N/A";
    let countryFlag = "";
    let countrySecLabel = "Unspecified";

    if (rawCountryCode) {
      const cMeta = countryCodeMap[rawCountryCode];
      if (cMeta) {
        countryName = cMeta.name;
        countryIso = cMeta.isoAlpha3 || rawCountryCode;
        countryFlag = cMeta.flag || "";
        countrySecLabel = countryFlag ? `${countryFlag} ${countryIso}` : countryIso;
      } else {
        countryName = refMap[rawCountryCode] || rawCountryCode;
        countryIso = rawCountryCode;
        countrySecLabel = countryIso;
      }
    }

    if (!countryCounts[countryName]) {
      countryCounts[countryName] = { count: 0, code: countryIso, flag: countryFlag, label: countrySecLabel };
    }
    countryCounts[countryName].count++;

    // --- 2. Academic Program, School & Hierarchy Resolution ---
    const acad = Array.isArray(student.student_academic)
      ? student.student_academic[0]
      : student.student_academic;

    const rawProgId = (acad?.program_id || "").trim();
    const rawProgCode = (acad?.program_code || "").trim();

    let progInfo: ProgramMeta | undefined = undefined;
    if (rawProgId && programMap[rawProgId.toLowerCase()]) {
      progInfo = programMap[rawProgId.toLowerCase()];
    } else if (rawProgCode) {
      progInfo = programMap[rawProgCode.toLowerCase()]
        || programMap[rawProgCode.replace(/_/g, "-").toLowerCase()]
        || normalizedNameMap[normalizeProgName(rawProgCode)];
    }

    const progName = progInfo?.name || (rawProgCode ? (refMap[rawProgCode] || rawProgCode) : "Unknown / Not Provided");
    const progCode = progInfo?.code || rawProgCode || undefined;
    const rawLevel = progInfo?.level || "Other";
    const levelLabel = getAcademicLevelLabel(rawLevel);

    // Effective school resolution: override first -> canonical program school -> fallback
    const isOverridden = Boolean(acad?.override_school_id);
    const schoolName = (isOverridden && acad?.override_school_id && schoolsMap[acad.override_school_id])
      ? schoolsMap[acad.override_school_id]
      : (progInfo?.school || (acad?.override_school_id ? schoolsMap[acad.override_school_id] : null) || "Unknown / Not Provided");
    const schoolCode = schoolsCodeMap[schoolName] || undefined;

    // Increment School count
    if (!schoolCounts[schoolName]) {
      schoolCounts[schoolName] = { count: 0, code: schoolCode };
    }
    schoolCounts[schoolName].count++;

    // Increment Program count
    if (!programCounts[progName]) {
      programCounts[progName] = { count: 0, code: progCode, level: levelLabel, school: schoolName };
    }
    programCounts[progName].count++;

    // Increment Academic Hierarchy Tree
    if (!hierarchyMap[schoolName]) {
      hierarchyMap[schoolName] = { schoolCode, levels: {} };
    }
    if (!hierarchyMap[schoolName].levels[levelLabel]) {
      hierarchyMap[schoolName].levels[levelLabel] = { courses: {} };
    }
    if (!hierarchyMap[schoolName].levels[levelLabel].courses[progName]) {
      hierarchyMap[schoolName].levels[levelLabel].courses[progName] = { count: 0, code: progCode };
    }
    hierarchyMap[schoolName].levels[levelLabel].courses[progName].count++;

    // --- 3. NFSU Campus Resolution ---
    const rawCampus = (acad?.nfsu_campus || "").trim();
    let campusName = "Unknown / Not Provided";
    let campusCode: string | undefined = undefined;
    let campusLocation: string | undefined = undefined;

    if (rawCampus) {
      const cMeta = campusesMap[rawCampus.toLowerCase()];
      if (cMeta) {
        campusName = cMeta.name;
        campusCode = cMeta.code;
        campusLocation = cMeta.location;
      } else {
        campusName = rawCampus;
      }
    }

    if (!campusCounts[campusName]) {
      campusCounts[campusName] = { count: 0, code: campusCode, location: campusLocation };
    }
    campusCounts[campusName].count++;
  });

  // Convert and Sort Distribution Arrays
  const studentsByCountry = Object.entries(countryCounts)
    .map(([name, data]) => ({
      name,
      value: data.count,
      code: data.code,
      secondaryLabel: data.label,
      meta: { flag: data.flag }
    }))
    .sort((a, b) => b.value - a.value);

  const studentsBySchool = Object.entries(schoolCounts)
    .map(([name, data]) => ({
      name,
      value: data.count,
      code: data.code,
      secondaryLabel: data.code
    }))
    .sort((a, b) => b.value - a.value);

  const studentsByProgram = Object.entries(programCounts)
    .map(([name, data]) => ({
      name,
      value: data.count,
      code: data.code,
      secondaryLabel: data.level,
      meta: { school: data.school }
    }))
    .sort((a, b) => b.value - a.value);

  // Backward compatibility alias
  const studentsByCourse = studentsByProgram;

  const studentsByCampus = Object.entries(campusCounts)
    .map(([name, data]) => ({
      name,
      value: data.count,
      code: data.code,
      secondaryLabel: data.location || data.code
    }))
    .sort((a, b) => b.value - a.value);

  // Convert Hierarchy Map to Structured Hierarchy Nodes
  const academicHierarchy = Object.entries(hierarchyMap).map(([sName, sData]) => {
    const schoolStudentCount = Object.values(sData.levels).reduce((sum, lvl) => {
      return sum + Object.values(lvl.courses).reduce((cSum, c) => cSum + c.count, 0);
    }, 0);

    const levels = Object.entries(sData.levels).map(([lvlName, lvlData]) => {
      const levelStudentCount = Object.values(lvlData.courses).reduce((sum, c) => sum + c.count, 0);

      const courses = Object.entries(lvlData.courses).map(([cName, cData]) => ({
        name: cName,
        code: cData.code,
        studentCount: cData.count,
        percentageOfSchool: schoolStudentCount > 0 ? (cData.count / schoolStudentCount) * 100 : 0,
        percentageOfTotal: totalActiveStudents > 0 ? (cData.count / totalActiveStudents) * 100 : 0
      })).sort((a, b) => b.studentCount - a.studentCount);

      return {
        level: lvlName,
        studentCount: levelStudentCount,
        percentageOfSchool: schoolStudentCount > 0 ? (levelStudentCount / schoolStudentCount) * 100 : 0,
        percentageOfTotal: totalActiveStudents > 0 ? (levelStudentCount / totalActiveStudents) * 100 : 0,
        courses
      };
    }).sort((a, b) => b.studentCount - a.studentCount);

    return {
      schoolName: sName,
      schoolCode: sData.schoolCode,
      studentCount: schoolStudentCount,
      percentageOfTotal: totalActiveStudents > 0 ? (schoolStudentCount / totalActiveStudents) * 100 : 0,
      levels
    };
  }).sort((a, b) => b.studentCount - a.studentCount);

  // Distinct Counter Metrics (Excluding "Unknown / Not Provided")
  const distinctCountriesCount = studentsByCountry.filter(c => c.name !== "Unknown / Not Provided").length;
  const distinctSchoolsCount = studentsBySchool.filter(s => s.name !== "Unknown / Not Provided").length;
  const distinctProgramsCount = studentsByProgram.filter(p => p.name !== "Unknown / Not Provided").length;
  const distinctCampusesCount = studentsByCampus.filter(c => c.name !== "Unknown / Not Provided").length;

  // Monthly Admissions Distribution (Grouped strictly by Year + Month of authoritative ISCMS registration)
  const monthlyAdmissions = aggregateMonthlyAdmissions(
    activeStudents.map(row => ({ created_at: row.created_at }))
  );

  // Authoritative date reference
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTime = today.getTime();

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

  // Unified Upcoming Expiry by Document Type
  const upcomingExpiryByDocType = {
    passport: { critical15: 0, expiring30: 0, safe: 0, expired: 0 },
    visa: { critical15: 0, expiring30: 0, safe: 0, expired: 0 },
    efrro: { critical15: 0, expiring30: 0, safe: 0, expired: 0 }
  };

  const complianceCategoryCounts: Record<string, number> = {
    "Fully Compliant": 0,
    "Expiring Soon (30 Days)": 0,
    "Critical Expiry (15 Days)": 0,
    "Expired Documents": 0,
    "Incomplete / Action Required": 0
  };

  (snapshotRes.data || []).forEach((row: any) => {
    const pDays = calcDays(row.passport_expiry);
    const vDays = calcDays(row.visa_expiry);
    const eDays = calcDays(row.efrro_expiry);

    const pNum = (row.passport_number || "").trim();
    const vNum = (row.visa_number || "").trim();
    const eNum = (row.efrro_number || "").trim();

    const pHasValidData = Boolean(pNum && row.passport_expiry && pDays !== null);
    const vHasValidData = Boolean(vNum && row.visa_expiry && vDays !== null);
    const eHasValidData = Boolean(eNum && row.efrro_expiry && eDays !== null);
    const hasAllRequiredData = pHasValidData && vHasValidData && eHasValidData;

    // Document breakdown
    const evalDoc = (days: number | null, key: "passport" | "visa" | "efrro") => {
      if (days === null) return;
      if (days < 0) upcomingExpiryByDocType[key].expired++;
      else if (days <= 15) upcomingExpiryByDocType[key].critical15++;
      else if (days <= 30) upcomingExpiryByDocType[key].expiring30++;
      else upcomingExpiryByDocType[key].safe++;
    };

    evalDoc(pDays, "passport");
    evalDoc(vDays, "visa");
    evalDoc(eDays, "efrro");

    // Student compliance status categorization with strict positive compliance requirement
    const sHasExpired = (pDays !== null && pDays < 0) || (vDays !== null && vDays < 0) || (eDays !== null && eDays < 0);
    const sHasCritical = (pDays !== null && pDays >= 0 && pDays <= 15) || (vDays !== null && vDays >= 0 && vDays <= 15) || (eDays !== null && eDays >= 0 && eDays <= 15);
    const sHasWarning = (pDays !== null && pDays > 15 && pDays <= 30) || (vDays !== null && vDays > 15 && vDays <= 30) || (eDays !== null && eDays > 15 && eDays <= 30);

    if (sHasExpired) {
      complianceCategoryCounts["Expired Documents"]++;
    } else if (!hasAllRequiredData) {
      complianceCategoryCounts["Incomplete / Action Required"]++;
    } else if (sHasCritical) {
      complianceCategoryCounts["Critical Expiry (15 Days)"]++;
    } else if (sHasWarning) {
      complianceCategoryCounts["Expiring Soon (30 Days)"]++;
    } else {
      complianceCategoryCounts["Fully Compliant"]++;
    }
  });

  const complianceDistribution = Object.entries(complianceCategoryCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  // eFRRO Expiry Timeline (preserved for timeline view)
  const efrroExpiryTimeline = aggregateEfrroExpiryTimeline(
    (snapshotRes.data || []).map(row => ({ efrro_expiry: (row as any).efrro_expiry, efrro_status: (row as any).efrro_status }))
  );

  // Notification Success Rate
  let sent = 0;
  let failed = 0;
  (notifRows || []).forEach(row => {
    if (row.status === "sent" || row.status === "delivered") sent++;
    else if (row.status === "failed" || row.status === "bounced") failed++;
  });
  const notificationSuccessRate = [
    { name: "Delivered Successfully", value: sent },
    { name: "Delivery Failed", value: failed }
  ];

  return {
    totalActiveStudents,
    distinctCountriesCount,
    distinctSchoolsCount,
    distinctProgramsCount,
    distinctCampusesCount,

    studentsByCountry,
    studentsBySchool,
    studentsByProgram,
    studentsByCourse,
    studentsByCampus,

    academicHierarchy,

    monthlyAdmissions,
    efrroExpiryTimeline,
    upcomingExpiryByDocType,
    complianceDistribution,
    notificationSuccessRate
  };
}

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
export async function _fetchAnalyticsChartsInternal() {
  const supabase = getAdminSupabase();

  // Execute ALL queries in parallel (including reference_data and academic_programs)
  const [
    countriesRes,
    academicRes,
    snapshotRes,
    notificationsRes,
    refDataRes,
    academicProgramsRes,
    schoolsRes,
    studentsRes
  ] = await Promise.all([
    // 1. Group by nationality (active, non-deleted students only)
    supabase
      .from("student_personal")
      .select("nationality_code, students!inner(id, status, deleted_at)")
      .is("deleted_at", null)
      .is("students.deleted_at", null)
      .eq("students.status", "active"),
    // 2. Group by program (active, non-deleted students only, with graceful fallback if migration 056 is pending)
    supabase
      .from("student_academic")
      .select("program_id, program_code, admission_date, override_school_id, students!inner(id, status, deleted_at)")
      .is("deleted_at", null)
      .is("students.deleted_at", null)
      .eq("students.status", "active")
      .then(async (res) => {
        if (res.error && res.error.message.includes("override_school_id")) {
          return supabase
            .from("student_academic")
            .select("program_id, program_code, admission_date, students!inner(id, status, deleted_at)")
            .is("deleted_at", null)
            .is("students.deleted_at", null)
            .eq("students.status", "active");
        }
        return res;
      }),
    // 3. Group by compliance and efrro expiry (active, non-deleted students only)
    supabase
      .from("student_snapshot")
      .select("compliance_status, efrro_expiry, efrro_status, students!inner(id, status, deleted_at)")
      .is("students.deleted_at", null)
      .eq("students.status", "active"),
    // 4. Group by notification statuses
    supabase.from(NOTIFICATION_TABLE_NAME).select("status"),
    // 5. Reference data
    supabase.from("reference_data").select("code, display_name, category"),
    // 6. Canonical academic programs master data
    supabase.from("academic_programs").select("id, program_name, program_code, school_name, academic_level"),
    // 7. Canonical schools master data (fallback to default if pending migration)
    supabase.from("schools").select("id, name, code").then((res) => {
      if (res.error) {
        return { data: DEFAULT_FALLBACK_SCHOOLS, error: null };
      }
      return res;
    }),
    // 8. Authoritative active student registrations for Admission Intake Distribution
    supabase
      .from("students")
      .select("id, created_at")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: true })
  ]);

  if (countriesRes.error) throw new Error(`[DB_QUERY_FAILED] ${countriesRes.error.message}`);
  if (academicRes.error) throw new Error(`[DB_QUERY_FAILED] ${academicRes.error.message}`);
  if (snapshotRes.error) throw new Error(`[DB_QUERY_FAILED] ${snapshotRes.error.message}`);
  if (notificationsRes.error) throw new Error(`[DB_QUERY_FAILED] ${notificationsRes.error.message}`);
  if (studentsRes.error) throw new Error(`[DB_QUERY_FAILED] ${studentsRes.error.message}`);

  const notifRows = notificationsRes.data || [];

  // Build reference map
  const refMap: Record<string, string> = {};
  if (refDataRes.data) {
    refDataRes.data.forEach(r => {
      refMap[r.code] = r.display_name;
    });
  }

  // Build ISO country map
  const countryCodeMap: Record<string, string> = {};
  const { ISO_MASTER_COUNTRIES } = await import("@/domain/countries/iso-countries.data");
  ISO_MASTER_COUNTRIES.forEach(c => {
    countryCodeMap[c.isoAlpha2.toUpperCase()] = c.name;
    countryCodeMap[c.isoAlpha3.toUpperCase()] = c.name;
  });

  // Build canonical academic programs and school map
  const { DEFAULT_FALLBACK_PROGRAMS, LEGACY_PROGRAM_ALIASES } = await import("@/domain/academic-programs/academic-program.service");
  
  interface ProgramMeta {
    id: string;
    name: string;
    code?: string;
    school?: string;
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
    const meta: ProgramMeta = { id: p.id, name, code: code || undefined, school };

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

  // 1. Students by Country
  const countryCounts: Record<string, number> = {};
  (countriesRes.data || []).forEach(row => {
    const rawCode = (row.nationality_code || "").trim().toUpperCase();
    const name = refMap[row.nationality_code] || countryCodeMap[rawCode] || row.nationality_code || "Unspecified";
    countryCounts[name] = (countryCounts[name] || 0) + 1;
  });
  const studentsByCountry = Object.entries(countryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 2 & 3. Students by Course & School (Grouped strictly by Canonical Program Identity & Override Resolution)
  const schoolsMap: Record<string, string> = {};
  if (schoolsRes.data) {
    schoolsRes.data.forEach(s => {
      schoolsMap[s.id] = s.name;
    });
  }

  const courseCounts: Record<string, number> = {};
  const schoolCounts: Record<string, number> = {};
  
  ((academicRes.data || []) as any[]).forEach((row: any) => {
    const rawProgId = (row.program_id || "").trim();
    const rawProgCode = (row.program_code || "").trim();

    // Canonical resolution: ID first -> Code/Alias -> Normalized Name -> Fallback
    let progInfo: ProgramMeta | undefined = undefined;
    if (rawProgId && programMap[rawProgId.toLowerCase()]) {
      progInfo = programMap[rawProgId.toLowerCase()];
    } else if (rawProgCode) {
      progInfo = programMap[rawProgCode.toLowerCase()] 
        || programMap[rawProgCode.replace(/_/g, "-").toLowerCase()]
        || normalizedNameMap[normalizeProgName(rawProgCode)];
    }

    const courseName = progInfo?.name || refMap[row.program_code] || row.program_code || "General Studies";
    
    // Effective school resolution: override if present, else canonical program school
    const isOverridden = Boolean(row.override_school_id);
    const schoolName = (isOverridden && row.override_school_id && schoolsMap[row.override_school_id])
      ? schoolsMap[row.override_school_id]
      : (progInfo?.school || "General Academic Faculty");

    courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
    schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1;
  });

  // Return clean canonical program name and student count WITHOUT code badge
  const studentsByCourse = Object.entries(courseCounts)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  const studentsBySchool = Object.entries(schoolCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 4. Monthly Admissions (Grouped strictly by Year + Month of authoritative ISCMS registration)
  const monthlyAdmissions = aggregateMonthlyAdmissions(
    ((studentsRes.data || []) as any[]).map(row => ({ created_at: row.created_at }))
  );

  // 5. eFRRO Expiry Timeline (Grouped strictly by Year + Month without timezone distortion)
  const efrroExpiryTimeline = aggregateEfrroExpiryTimeline(
    (snapshotRes.data || []).map(row => ({ efrro_expiry: row.efrro_expiry, efrro_status: row.efrro_status }))
  );

  // 6. Compliance Distribution
  const complianceStatusLabels: Record<string, string> = {
    COMPLIANT: "Fully Compliant",
    WARNING: "Expiring Soon (30 Days)",
    CRITICAL: "Critical Expiry (15 Days)",
    EXPIRED: "Expired Documents",
    PENDING_REVIEW: "Pending Verification",
    INCOMPLETE: "Incomplete Profile",
    MISSING: "Documents Missing"
  };
  const complianceCounts: Record<string, number> = {};
  (snapshotRes.data || []).forEach(row => {
    const rawStatus = (row.compliance_status || "MISSING").toUpperCase();
    const label = complianceStatusLabels[rawStatus] || rawStatus;
    complianceCounts[label] = (complianceCounts[label] || 0) + 1;
  });
  const complianceDistribution = Object.entries(complianceCounts).map(([name, value]) => ({ name, value }));

  // 7. Notification Success Rate
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
    studentsByCountry,
    studentsBySchool,
    studentsByCourse,
    monthlyAdmissions,
    efrroExpiryTimeline,
    complianceDistribution,
    notificationSuccessRate
  };
}

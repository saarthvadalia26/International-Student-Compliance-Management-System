"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { DashboardMetrics } from "@/domain/reports/types";
import { SupabaseReportRepository } from "@/domain/reports/repositories/report.repository";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";
import { unstable_cache } from "next/cache";

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
  return getCachedAnalyticsCharts();
}

// Internal (uncached) implementation
async function _fetchAnalyticsChartsInternal() {
  const supabase = getAdminSupabase();

  // Execute ALL queries in parallel (including reference_data which was previously sequential)
  const [
    countriesRes,
    academicRes,
    snapshotRes,
    notificationsRes,
    refDataRes
  ] = await Promise.all([
    // 1. Group by nationality
    supabase.from("student_personal").select("nationality_code"),
    // 2. Group by program
    supabase.from("student_academic").select("program_code, admission_date"),
    // 3. Group by compliance and efrro expiry
    supabase.from("student_snapshot").select("compliance_status, efrro_expiry, efrro_status"),
    // 4. Group by notification statuses
    supabase.from(NOTIFICATION_TABLE_NAME).select("status"),
    // 5. Reference data (moved into parallel batch — was previously sequential)
    supabase.from("reference_data").select("code, display_name, category")
  ]);

  if (countriesRes.error) throw new Error(`[DB_QUERY_FAILED] ${countriesRes.error.message}`);
  if (academicRes.error) throw new Error(`[DB_QUERY_FAILED] ${academicRes.error.message}`);
  if (snapshotRes.error) throw new Error(`[DB_QUERY_FAILED] ${snapshotRes.error.message}`);
  if (notificationsRes.error) throw new Error(`[DB_QUERY_FAILED] ${notificationsRes.error.message}`);

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

  // Build academic programs and school map
  const { DEFAULT_FALLBACK_PROGRAMS } = await import("@/domain/academic-programs/academic-program.service");
  const programMap: Record<string, { name: string; code?: string; school?: string }> = {};
  DEFAULT_FALLBACK_PROGRAMS.forEach(p => {
    const code = p.programCode || "";
    const name = p.programName || "";
    const school = p.schoolName || "General Academic Faculty";
    if (code) programMap[code.toUpperCase()] = { name, code, school };
    if (p.id) programMap[p.id.toUpperCase()] = { name, code, school };
    if (name) programMap[name.toUpperCase()] = { name, code, school };
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

  // 2 & 3. Students by Course & School
  const courseCounts: Record<string, { value: number; code?: string }> = {};
  const schoolCounts: Record<string, number> = {};
  (academicRes.data || []).forEach(row => {
    const rawProg = (row.program_code || "").trim().toUpperCase();
    const progInfo = programMap[rawProg];
    const courseName = progInfo?.name || refMap[row.program_code] || row.program_code || "General Studies";
    const schoolName = progInfo?.school || "General Academic Faculty";

    if (!courseCounts[courseName]) {
      courseCounts[courseName] = { value: 0, code: progInfo?.code };
    }
    courseCounts[courseName].value += 1;
    schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1;
  });

  const studentsByCourse = Object.entries(courseCounts)
    .map(([name, data]) => ({ name, value: data.value, secondaryLabel: data.code }))
    .sort((a, b) => b.value - a.value);

  const studentsBySchool = Object.entries(schoolCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 4. Monthly Admissions
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const admissionCounts: Record<string, { count: number; timestamp: number }> = {};
  (academicRes.data || []).forEach(row => {
    if (row.admission_date) {
      const date = new Date(row.admission_date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!admissionCounts[label]) {
        admissionCounts[label] = { count: 0, timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
      }
      admissionCounts[label].count += 1;
    }
  });
  const monthlyAdmissions = Object.entries(admissionCounts)
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .map(([name, data]) => ({ name, value: data.count }));

  // 5. eFRRO Expiry Timeline
  const expiryCounts: Record<string, { count: number; timestamp: number }> = {};
  (snapshotRes.data || []).forEach(row => {
    if (row.efrro_expiry && row.efrro_status !== "COMPLIANT") {
      const date = new Date(row.efrro_expiry);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!expiryCounts[label]) {
        expiryCounts[label] = { count: 0, timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
      }
      expiryCounts[label].count += 1;
    }
  });
  const efrroExpiryTimeline = Object.entries(expiryCounts)
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .map(([name, data]) => ({ name, value: data.count }));

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

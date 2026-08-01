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

  // 1. Students by Country
  const countryCounts: Record<string, number> = {};
  (countriesRes.data || []).forEach(row => {
    const name = refMap[row.nationality_code] || row.nationality_code || "Unknown";
    countryCounts[name] = (countryCounts[name] || 0) + 1;
  });
  const studentsByCountry = Object.entries(countryCounts).map(([name, value]) => ({ name, value }));

  // 2 & 3. Students by Course & School
  const courseCounts: Record<string, number> = {};
  const schoolCounts: Record<string, number> = {};
  (academicRes.data || []).forEach(row => {
    const courseName = refMap[row.program_code] || row.program_code || "Unknown";
    courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;

    // School mapping fallback
    const schoolName = "School of Forensic Sciences";
    schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1;
  });
  const studentsByCourse = Object.entries(courseCounts).map(([name, value]) => ({ name, value }));
  const studentsBySchool = Object.entries(schoolCounts).map(([name, value]) => ({ name, value }));

  // 4. Monthly Admissions
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const admissionCounts: Record<string, number> = {};
  (academicRes.data || []).forEach(row => {
    if (row.admission_date) {
      const date = new Date(row.admission_date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      admissionCounts[label] = (admissionCounts[label] || 0) + 1;
    }
  });
  const monthlyAdmissions = Object.entries(admissionCounts).map(([name, value]) => ({ name, value }));

  // 5. eFRRO Expiry Timeline
  const expiryCounts: Record<string, number> = {};
  (snapshotRes.data || []).forEach(row => {
    if (row.efrro_expiry && row.efrro_status !== "COMPLIANT") {
      const date = new Date(row.efrro_expiry);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      expiryCounts[label] = (expiryCounts[label] || 0) + 1;
    }
  });
  const efrroExpiryTimeline = Object.entries(expiryCounts).map(([name, value]) => ({ name, value }));

  // 6. Compliance Distribution
  const complianceCounts: Record<string, number> = {};
  (snapshotRes.data || []).forEach(row => {
    const status = row.compliance_status || "MISSING";
    complianceCounts[status] = (complianceCounts[status] || 0) + 1;
  });
  const complianceDistribution = Object.entries(complianceCounts).map(([name, value]) => ({ name, value }));

  // 7. Notification Success Rate
  let sent = 0;
  let failed = 0;
  (notifRows || []).forEach(row => {
    if (row.status === "sent") sent++;
    else if (row.status === "failed") failed++;
  });
  const notificationSuccessRate = [
    { name: "Sent (Success)", value: sent },
    { name: "Failed", value: failed }
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

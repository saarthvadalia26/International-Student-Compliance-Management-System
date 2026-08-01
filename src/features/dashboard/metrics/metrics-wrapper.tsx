import { fetchDashboardMetrics } from "@/app/(app)/dashboard/actions";
import { DashboardMetricsGrid } from "@/features/dashboard/metrics";

/**
 * Async Server Component wrapper for dashboard KPI metrics.
 * Used inside a <Suspense> boundary so the parent page can stream
 * the shell immediately while this component fetches data.
 */
export default async function MetricsWrapper() {
  const metrics = await fetchDashboardMetrics();
  return <DashboardMetricsGrid metrics={metrics} />;
}

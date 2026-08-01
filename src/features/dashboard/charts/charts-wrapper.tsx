import { fetchAnalyticsCharts } from "@/app/(app)/dashboard/actions";
import { DashboardCharts } from "@/app/(app)/dashboard/dashboard-charts";

/**
 * Async Server Component wrapper for dashboard analytics charts.
 * Used inside a <Suspense> boundary so charts load asynchronously
 * without blocking the initial page render.
 */
export default async function ChartsWrapper() {
  const chartsData = await fetchAnalyticsCharts();
  return <DashboardCharts chartsData={chartsData} />;
}

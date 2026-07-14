import * as React from "react";
import { Suspense } from "react";
import { fetchDashboardMetrics, fetchAnalyticsCharts } from "./actions";
import { DashboardMetricsGrid, DashboardQuickActions } from "@/features/dashboard/metrics";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCharts } from "./dashboard-charts";

export const revalidate = 0; // Disable static rendering caching for real-time dashboard

export default async function DashboardPage() {
  // Await data fetching in Server Component
  const [metrics, chartsData] = await Promise.all([
    fetchDashboardMetrics(),
    fetchAnalyticsCharts()
  ]);

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6">
      {/* Header section */}
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Operational Compliance Dashboard</h1>
        <p className="font-caption text-xs text-muted-foreground mt-1">
          NFSU International Student Cell administrative tracking overview. eFRRO alert thresholds and document verifications.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <DashboardMetricsGrid metrics={metrics} />
      </Suspense>

      {/* Operations Quick Actions */}
      <DashboardQuickActions />

      {/* Analytics Charts Grid */}
      <DashboardCharts chartsData={chartsData} />
    </div>
  );
}

import * as React from "react";
import { Suspense } from "react";
import { DashboardQuickActions } from "@/features/dashboard/metrics";
import { Skeleton } from "@/components/ui/skeleton";
import { Branding } from "@/config/branding";
import MetricsWrapper from "@/features/dashboard/metrics/metrics-wrapper";
import ChartsWrapper from "@/features/dashboard/charts/charts-wrapper";
import { RealtimeDashboardListener } from "@/features/dashboard/components/realtime-dashboard-listener";

/**
 * Dashboard Page — Streaming Architecture
 * 
 * The page shell (header, quick actions) renders instantly.
 * KPI metrics and analytics charts stream in via React Suspense
 * boundaries, each backed by their own async Server Component.
 * 
 * Data is cached for 60 seconds via unstable_cache in actions.ts,
 * so repeat navigations within that window are near-instant.
 */

// Skeleton fallbacks for streaming sections
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6">
      {/* Event-driven Realtime listener for dynamic metrics updates without full page reloads */}
      <RealtimeDashboardListener />

      {/* Header section — renders instantly */}
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Operational Compliance Dashboard</h1>
        <p className="font-caption text-xs text-muted-foreground mt-1">
          {Branding.shortName} International Student Cell administrative tracking overview. eFRRO alert thresholds and document verifications.
        </p>
      </div>

      {/* KPI Cards Grid — streams in asynchronously */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsWrapper />
      </Suspense>

      {/* Operations Quick Actions — renders instantly (client component, no data) */}
      <DashboardQuickActions />

      {/* Analytics Charts Grid — streams in asynchronously */}
      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsWrapper />
      </Suspense>
    </div>
  );
}

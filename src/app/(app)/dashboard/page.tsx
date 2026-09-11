import * as React from "react";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DashboardQuickActions } from "@/features/dashboard/metrics";
import { Branding } from "@/config/branding";
import MetricsWrapper from "@/features/dashboard/metrics/metrics-wrapper";
import ChartsWrapper from "@/features/dashboard/charts/charts-wrapper";
import { RealtimeDashboardListener } from "@/features/dashboard/components/realtime-dashboard-listener";
import { DuplicateStudentsBanner } from "@/components/alerts/duplicate-students-banner";

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

// Spinner loading fallbacks for streaming sections
function MetricsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-14 space-y-3 rounded-xl border border-border/40 bg-card/40 animate-fade-in">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground font-medium">Loading compliance metrics...</span>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 rounded-xl border border-border/40 bg-card/40 animate-fade-in">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground font-medium">Loading analytics charts...</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in min-w-0 max-w-full">
      {/* Event-driven Realtime listener for dynamic metrics updates without full page reloads */}
      <RealtimeDashboardListener />

      {/* Header section — renders instantly */}
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Operational Compliance Dashboard</h1>
        <p className="font-caption text-xs text-muted-foreground mt-1">
          {Branding.shortName} International Student Cell administrative tracking overview. Authoritative compliance status across Passport, Visa, and eFRRO permits.
        </p>
      </div>

      {/* Actionable Error Alert: Duplicate Student Records Detection */}
      <DuplicateStudentsBanner />

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

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { revalidateDashboardData } from "@/app/(app)/dashboard/actions";

/**
 * Event-driven Realtime listener for the Compliance Dashboard.
 * Listens to mutations on students, snapshot metrics, document versions, and notifications.
 * Invalidates Next.js cache tags and triggers router.refresh() to update Server Components dynamically
 * without causing a full page reload or breaking active client state.
 */
export function RealtimeDashboardListener() {
  const router = useRouter();

  const handleDashboardMutation = React.useCallback(async () => {
    console.log("[REALTIME_DASHBOARD] Mutation detected. Revalidating cache tags and refreshing...");
    try {
      await revalidateDashboardData();
    } catch (err) {
      console.warn("[REALTIME_DASHBOARD] Cache revalidation warning:", err);
    }
    router.refresh();
  }, [router]);

  // Subscribe to core data entities that affect dashboard counts
  useRealtimeSubscription({ table: "students", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "student_personal", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "student_academic", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "student_snapshot", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "passport_versions", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "visa_versions", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "efrro_versions", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "notifications", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "academic_programs", onEvent: handleDashboardMutation });
  useRealtimeSubscription({ table: "schools", onEvent: handleDashboardMutation });

  return null; // Silent listener component
}

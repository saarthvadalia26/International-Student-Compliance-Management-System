import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Global App Router loading fallback for workspace routes.
 * Ensures instant (< 100ms) visual response on clicking sidebar links
 * while destination route Server Components complete data fetching.
 */
export default function AppWorkspaceLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-6">
      {/* Header section skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Filter / Actions bar skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>

      {/* Main Content / Table Grid skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

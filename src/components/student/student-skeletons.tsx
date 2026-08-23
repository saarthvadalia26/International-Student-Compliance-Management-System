import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Enterprise Profile Header Skeleton */}
      <Card className="border border-border/70 bg-gradient-to-br from-card via-card/95 to-primary/5 rounded-2xl p-6 md:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-8">
          {/* Avatar Skeleton */}
          <div className="flex flex-col items-center shrink-0">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
          </div>

          {/* Center Info Skeleton */}
          <div className="flex-1 space-y-4 text-center md:text-left w-full min-w-0">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 mx-auto md:mx-0 rounded-lg" />
              <Skeleton className="h-4 w-48 mx-auto md:mx-0 rounded-md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>

          {/* Right Action Skeleton */}
          <div className="flex flex-col items-center md:items-end justify-between self-stretch gap-4 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-11 w-full md:w-40 rounded-xl" />
          </div>
        </div>
      </Card>

      {/* Compliance Status Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <Card key={idx} className="border-border/80 rounded-2xl p-4 shadow-xs bg-card flex flex-col justify-between h-[160px]">
            <div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-5 w-28 rounded-lg" />
                <Skeleton className="h-3.5 w-36" />
              </div>
            </div>
            <div className="pt-3 mt-2 border-t border-border/50">
              <Skeleton className="h-3.5 w-32" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DocumentCentreSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-muted/40 rounded-xl w-fit">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Main Upload Card Skeleton */}
      <Card className="border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-60" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Upload Dropzone Placeholder */}
        <div className="border-2 border-dashed border-border/60 rounded-2xl p-12 flex flex-col items-center justify-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}

export function StudentProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header Profile Summary Card Skeleton */}
      <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md pt-1" />
          </div>
        </div>
      </Card>

      {/* Grid: Personal & Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((idx) => (
          <Card key={idx} className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-border/50">
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Records Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((idx) => (
          <Card key={idx} className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudentHistorySkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-6 w-60 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      <div className="flex gap-2 p-1.5 bg-muted/40 rounded-xl w-fit">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((idx) => (
          <Card key={idx} className="border-border/80 rounded-2xl p-4 shadow-xs bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-64" />
          </Card>
        ))}
      </div>
    </div>
  );
}

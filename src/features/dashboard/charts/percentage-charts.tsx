"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export interface DataPoint {
  name: string;
  value: number;
  secondaryLabel?: string;
}

/**
 * Computes safe whole or single-decimal percentage: (value / total) * 100.
 */
export function calculatePercentage(value: number, total: number, decimals: number = 0): string {
  if (!total || total <= 0 || !value || value <= 0) return "0%";
  const pct = (value / total) * 100;
  if (decimals === 0) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Formats a ratio string with count and total (e.g. "45 / 100 students").
 */
export function formatRatioContext(value: number, total: number, unit: string = "students"): string {
  return `${value.toLocaleString()} of ${total.toLocaleString()} ${unit}`;
}

// ============================================================================
// 1. Percentage Distribution List (Ranked Categories, Countries, Schools, Courses)
// ============================================================================
interface PercentageDistributionListProps {
  data: DataPoint[];
  maxItems?: number;
  unit?: string;
  emptyMessage?: string;
}

export function PercentageDistributionList({
  data,
  maxItems = 6,
  unit = "students",
  emptyMessage = "No categorical data available"
}: PercentageDistributionListProps) {
  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const sortedData = React.useMemo(() => {
    return [...data]
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const displayItems = sortedData.slice(0, maxItems);
  const remainingCount = sortedData.slice(maxItems).reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || sortedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Summary Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40 font-medium">
        <span className="text-muted-foreground">Category ({sortedData.length} distinct)</span>
        <span className="text-foreground font-semibold">
          {total.toLocaleString()} {unit} total
        </span>
      </div>

      {/* Ranked Category Rows */}
      <div className="space-y-3">
        {displayItems.map((item, idx) => {
          const pctNumber = total > 0 ? (item.value / total) * 100 : 0;
          const pctFormatted = calculatePercentage(item.value, total, pctNumber < 1 && pctNumber > 0 ? 1 : 0);

          return (
            <div key={idx} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-medium text-muted-foreground/80 w-4 shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="font-medium text-foreground truncate" title={item.name}>
                    {item.name}
                  </span>
                  {item.secondaryLabel && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 px-1.5 py-0.5 rounded bg-muted/40 border border-border/30">
                      {item.secondaryLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {pctFormatted}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans">
                    ({item.value.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Accessible High-Contrast Percentage Progress Bar */}
              <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/80 rounded-full transition-all duration-300 group-hover:bg-foreground"
                  style={{ width: `${Math.min(100, Math.max(2, pctNumber))}%` }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-label={`${item.name}: ${pctFormatted}`}
                />
              </div>
            </div>
          );
        })}

        {/* Aggregate remainder if exceeding maxItems */}
        {remainingCount > 0 && (
          <div className="pt-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30">
            <span>Other ({sortedData.length - maxItems} additional categories)</span>
            <span className="font-mono font-medium">
              {calculatePercentage(remainingCount, total)} ({remainingCount.toLocaleString()} {unit})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. Compliance Distribution & Status Breakdown
// ============================================================================
interface ComplianceBreakdownProps {
  data: DataPoint[];
  emptyMessage?: string;
}

// Status mapping with standardized labels and descriptions
const COMPLIANCE_STATUS_ORDER = ["COMPLIANT", "WARNING", "CRITICAL", "EXPIRED", "PENDING_REVIEW", "INCOMPLETE", "MISSING"];

export function ComplianceDistributionBreakdown({
  data,
  emptyMessage = "No compliance records found"
}: ComplianceBreakdownProps) {
  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const compliantItem = data.find(
    d => d.name.toUpperCase() === "COMPLIANT" || d.name.toUpperCase().includes("FULLY")
  );
  const compliantCount = compliantItem?.value || 0;
  const compliantPercentage = calculatePercentage(compliantCount, total, 1);

  const sortedCategories = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const idxA = COMPLIANCE_STATUS_ORDER.indexOf(a.name.toUpperCase());
      const idxB = COMPLIANCE_STATUS_ORDER.indexOf(b.name.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.value - a.value;
    });
  }, [data]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Primary KPI Hero Summary */}
      <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {compliantPercentage}
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5">
            Fully Compliant Students
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-foreground">
            {compliantCount.toLocaleString()} / {total.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Verified Active Profiles
          </p>
        </div>
      </div>

      {/* Segmented Linear Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>Status Distribution</span>
          <span>100% Total Cohort</span>
        </div>
        <div className="h-3 w-full bg-muted/60 rounded-md overflow-hidden flex">
          {sortedCategories.map((cat, idx) => {
            if (cat.value <= 0) return null;
            const pct = (cat.value / total) * 100;
            // Differentiate segments using opacity patterns rather than distinct colors
            const opacityClass = idx === 0 
              ? "bg-foreground" 
              : idx === 1 
              ? "bg-foreground/75" 
              : idx === 2 
              ? "bg-foreground/55" 
              : idx === 3 
              ? "bg-foreground/40" 
              : "bg-foreground/25";

            return (
              <div
                key={idx}
                className={cn("h-full border-r border-background/40 first:rounded-l last:rounded-r last:border-r-0", opacityClass)}
                style={{ width: `${pct}%` }}
                title={`${cat.name}: ${cat.value} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Detailed Category Percentage Table */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        {sortedCategories.map((cat, idx) => {
          const pctFormatted = calculatePercentage(cat.value, total, 1);
          return (
            <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-foreground/70 shrink-0" />
                <span className="font-medium text-foreground">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-foreground">{pctFormatted}</span>
                <span className="text-[11px] text-muted-foreground w-16 text-right font-sans">
                  {cat.value.toLocaleString()} std
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 3. Delivery & Success Rate Meter
// ============================================================================
interface DeliverySuccessMeterProps {
  data: DataPoint[];
  title?: string;
  emptyMessage?: string;
}

export function DeliverySuccessMeter({
  data,
  emptyMessage = "No notification dispatch records logged"
}: DeliverySuccessMeterProps) {
  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const sentItem = data.find(d => d.name.toLowerCase().includes("sent") || d.name.toLowerCase().includes("success"));
  const failedItem = data.find(d => d.name.toLowerCase().includes("fail"));

  const sentCount = sentItem?.value || 0;
  const failedCount = failedItem?.value || 0;

  const successRate = calculatePercentage(sentCount, total, 1);
  const failureRate = calculatePercentage(failedCount, total, 1);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Primary KPI Hero Box */}
      <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {successRate}
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5">
            Successful Delivery Rate
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-foreground">
            {sentCount.toLocaleString()} / {total.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Dispatches Logged
          </p>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>Delivered vs Failed Dispatches</span>
          <span>{total.toLocaleString()} Total</span>
        </div>
        <div className="h-3 w-full bg-muted/60 rounded-md overflow-hidden flex">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${total > 0 ? (sentCount / total) * 100 : 0}%` }}
            title={`Sent: ${sentCount} (${successRate})`}
          />
          <div
            className="h-full bg-foreground/30 transition-all duration-300"
            style={{ width: `${total > 0 ? (failedCount / total) * 100 : 0}%` }}
            title={`Failed: ${failedCount} (${failureRate})`}
          />
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-2.5 rounded-lg border border-border/40 bg-card">
          <div className="text-[11px] font-medium text-muted-foreground">Sent Successfully</div>
          <div className="text-base font-bold font-mono text-foreground mt-1">{successRate}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{sentCount.toLocaleString()} notifications</div>
        </div>

        <div className="p-2.5 rounded-lg border border-border/40 bg-card">
          <div className="text-[11px] font-medium text-muted-foreground">Failed Deliveries</div>
          <div className="text-base font-bold font-mono text-foreground mt-1">{failureRate}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{failedCount.toLocaleString()} failures</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. Timeline & Intake Distribution (Monthly Expiries & Admissions)
// ============================================================================
interface TimelineDistributionProps {
  data: DataPoint[];
  metricLabel?: string;
  emptyMessage?: string;
}

export function TimelinePercentageDistribution({
  data,
  metricLabel = "Records",
  emptyMessage = "No timeline events recorded"
}: TimelineDistributionProps) {
  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const maxVal = React.useMemo(() => {
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header Context */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40 font-medium">
        <span className="text-muted-foreground">Period / Milestone</span>
        <span className="text-foreground font-semibold">
          {total.toLocaleString()} {metricLabel.toLowerCase()} total
        </span>
      </div>

      {/* Horizontal Milestone Bars */}
      <div className="space-y-3">
        {data.map((item, idx) => {
          const relativeWidth = maxVal > 0 ? (item.value / maxVal) * 100 : 0;

          return (
            <div key={idx} className="space-y-1 group">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">
                    {calculatePercentage(item.value, total, 0)}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans">
                    ({item.value.toLocaleString()})
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/80 rounded-full transition-all duration-300 group-hover:bg-foreground"
                  style={{ width: `${Math.max(2, relativeWidth)}%` }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={maxVal}
                  aria-label={`${item.name}: ${calculatePercentage(item.value, total)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

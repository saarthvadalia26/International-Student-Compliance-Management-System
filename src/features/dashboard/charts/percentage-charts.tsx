"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  Inbox, 
  Search, 
  ArrowUpDown, 
  Table, 
  BarChart2, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Globe, 
  Building2, 
  GraduationCap, 
  Landmark, 
  Layers, 
  X,
  ListTree,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react";

export interface DataPoint {
  name: string;
  value: number;
  secondaryLabel?: string;
  code?: string;
  meta?: Record<string, any>;
}

export interface AcademicHierarchyCourseNode {
  name: string;
  code?: string;
  studentCount: number;
  percentageOfSchool: number;
  percentageOfTotal: number;
}

export interface AcademicHierarchyLevelNode {
  level: string;
  studentCount: number;
  percentageOfSchool: number;
  percentageOfTotal: number;
  courses: AcademicHierarchyCourseNode[];
}

export interface AcademicHierarchySchoolNode {
  schoolId?: string;
  schoolName: string;
  schoolCode?: string;
  studentCount: number;
  percentageOfTotal: number;
  levels: AcademicHierarchyLevelNode[];
}

export interface UpcomingExpiryByDocTypeData {
  passport: { critical15: number; expiring30: number; safe: number; expired: number };
  visa: { critical15: number; expiring30: number; safe: number; expired: number };
  efrro: { critical15: number; expiring30: number; safe: number; expired: number };
}

export interface DashboardChartsData {
  totalActiveStudents: number;
  distinctCountriesCount: number;
  distinctSchoolsCount: number;
  distinctProgramsCount: number;
  distinctCampusesCount: number;

  studentsByCountry: DataPoint[];
  studentsBySchool: DataPoint[];
  studentsByProgram: DataPoint[];
  studentsByCourse: DataPoint[];
  studentsByCampus: DataPoint[];

  academicHierarchy: AcademicHierarchySchoolNode[];

  monthlyAdmissions: DataPoint[];
  efrroExpiryTimeline: DataPoint[];
  upcomingExpiryByDocType?: UpcomingExpiryByDocTypeData;
  complianceDistribution: DataPoint[];
  notificationSuccessRate: DataPoint[];
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
                  <span className="font-medium text-foreground break-words sm:truncate leading-tight min-w-0" title={item.name}>
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
const COMPLIANCE_STATUS_ORDER = ["FULLY COMPLIANT", "COMPLIANT", "EXPIRING SOON (30 DAYS)", "WARNING", "CRITICAL EXPIRES (15 DAYS)", "CRITICAL", "EXPIRED DOCUMENTS", "EXPIRED"];

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

  const getStatusTheme = (name: string) => {
    const upper = name.toUpperCase();
    if (upper.includes("COMPLIANT")) {
      return { bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (upper.includes("WARNING")) {
      return { bar: "bg-amber-500", dot: "bg-amber-500", badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (upper.includes("CRITICAL")) {
      return { bar: "bg-orange-500", dot: "bg-orange-500", badge: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20" };
    }
    if (upper.includes("EXPIRED")) {
      return { bar: "bg-rose-500", dot: "bg-rose-500", badge: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (upper.includes("PENDING")) {
      return { bar: "bg-blue-500", dot: "bg-blue-500", badge: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" };
    }
    return { bar: "bg-violet-500", dot: "bg-violet-500", badge: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20" };
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Primary KPI Hero Summary */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-foreground">
              {compliantPercentage}
            </div>
            <p className="text-xs font-semibold text-foreground/90 mt-0.5">
              Fully Compliant Students
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
            {compliantCount.toLocaleString()} / {total.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Verified Profiles
          </p>
        </div>
      </div>

      {/* Segmented Linear Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>Status Cohort Distribution</span>
          <span className="font-mono">100% Total Cohort</span>
        </div>
        <div className="h-3 w-full bg-muted/60 rounded-lg overflow-hidden flex p-0.5 border border-border/30 gap-0.5">
          {sortedCategories.map((cat, idx) => {
            if (cat.value <= 0) return null;
            const pct = (cat.value / total) * 100;
            const theme = getStatusTheme(cat.name);

            return (
              <div
                key={idx}
                className={cn("h-full first:rounded-l-md last:rounded-r-md transition-all hover:brightness-110", theme.bar)}
                style={{ width: `${pct}%` }}
                title={`${cat.name}: ${cat.value} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Detailed Category Percentage Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
        {sortedCategories.map((cat, idx) => {
          const pctFormatted = calculatePercentage(cat.value, total, 1);
          const theme = getStatusTheme(cat.name);
          return (
            <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 rounded-full shrink-0", theme.dot)} />
                <span className="font-medium text-foreground truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className="font-bold text-foreground">{pctFormatted}</span>
                <span className="text-[11px] text-muted-foreground">({cat.value.toLocaleString()})</span>
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
    <div className="space-y-4 w-full">
      {/* Primary KPI Hero Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border border-blue-500/30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/25 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-foreground">
              {successRate}
            </div>
            <p className="text-xs font-semibold text-foreground/90 mt-0.5">
              Successful Delivery Rate
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
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
          <span className="font-mono">{total.toLocaleString()} Total</span>
        </div>
        <div className="h-3 w-full bg-muted/60 rounded-lg overflow-hidden flex p-0.5 border border-border/30 gap-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-md transition-all duration-300"
            style={{ width: `${total > 0 ? (sentCount / total) * 100 : 0}%` }}
            title={`Delivered: ${sentCount} (${successRate})`}
          />
          <div
            className="h-full bg-rose-500 rounded-r-md transition-all duration-300"
            style={{ width: `${total > 0 ? (failedCount / total) * 100 : 0}%` }}
            title={`Failed: ${failedCount} (${failureRate})`}
          />
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Delivered</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-foreground mt-1">{successRate}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{sentCount.toLocaleString()} dispatches</div>
        </div>

        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Failed</span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-foreground mt-1">{failureRate}</div>
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
        <span className="text-muted-foreground">Milestone Period</span>
        <span className="text-foreground font-semibold font-mono">
          {total.toLocaleString()} {metricLabel.toLowerCase()} total
        </span>
      </div>

      {/* Horizontal Milestone Bars */}
      <div className="space-y-2.5">
        {data.map((item, idx) => {
          const relativeWidth = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
          const pctFormatted = calculatePercentage(item.value, total, 1);

          return (
            <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 hover:bg-muted/30 transition-all group space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">
                    {pctFormatted}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans">
                    ({item.value.toLocaleString()})
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 group-hover:brightness-110"
                  style={{ width: item.value > 0 ? `${Math.max(3, relativeWidth)}%` : "0%" }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={maxVal}
                  aria-label={`${item.name}: ${pctFormatted}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 5. Executive Summary Metric Strip (Level 1 Institutional Roster Overview)
// ============================================================================
interface AnalyticsExecutiveSummaryStripProps {
  totalStudents: number;
  distinctCountries: number;
  distinctSchools: number;
  distinctPrograms: number;
  distinctCampuses: number;
  className?: string;
}

export function AnalyticsExecutiveSummaryStrip({
  totalStudents,
  distinctCountries,
  distinctSchools,
  distinctPrograms,
  distinctCampuses,
  className
}: AnalyticsExecutiveSummaryStripProps) {
  const items = [
    {
      title: "Total Enrolled",
      value: totalStudents.toLocaleString(),
      subtitle: "Active international students",
      icon: Users,
      badge: "100% Roster",
      gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
      accentBorder: "border-blue-500/30 hover:border-blue-500/60",
      accentText: "text-blue-500 dark:text-blue-400",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
      badgeStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    {
      title: "Countries Represented",
      value: distinctCountries.toLocaleString(),
      subtitle: "Sovereign global nations",
      icon: Globe,
      badge: "Demographics",
      gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      accentBorder: "border-emerald-500/30 hover:border-emerald-500/60",
      accentText: "text-emerald-500 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    {
      title: "Academic Schools",
      value: distinctSchools.toLocaleString(),
      subtitle: "Active university faculties",
      icon: Building2,
      badge: "Faculties",
      gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
      accentBorder: "border-amber-500/30 hover:border-amber-500/60",
      accentText: "text-amber-500 dark:text-amber-400",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      badgeStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    },
    {
      title: "Degree Programs",
      value: distinctPrograms.toLocaleString(),
      subtitle: "Active enrolled courses",
      icon: GraduationCap,
      badge: "Curriculum",
      gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
      accentBorder: "border-violet-500/30 hover:border-violet-500/60",
      accentText: "text-violet-500 dark:text-violet-400",
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
      badgeStyle: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
    },
    {
      title: "NFSU Campuses",
      value: distinctCampuses.toLocaleString(),
      subtitle: "Enrolled campus locations",
      icon: Landmark,
      badge: "Campuses",
      gradient: "from-cyan-500/15 via-cyan-500/5 to-transparent",
      accentBorder: "border-cyan-500/30 hover:border-cyan-500/60",
      accentText: "text-cyan-500 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
      badgeStyle: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
    }
  ];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 min-w-0 max-w-full", className)}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isLast = idx === items.length - 1;
        return (
          <div
            key={idx}
            className={cn(
              "relative group flex flex-col justify-between rounded-2xl border bg-card/90 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 min-w-0 overflow-hidden",
              item.accentBorder,
              isLast && "col-span-2 sm:col-span-1"
            )}
          >
            {/* Ambient themed background gradient */}
            <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity", item.gradient)} />

            {/* Top Row: Themed Icon pill & Badge */}
            <div className="relative z-10 flex items-center justify-between gap-2 min-w-0 mb-3">
              <div className={cn("p-2 sm:p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110 shrink-0", item.iconBg)}>
                <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap", item.badgeStyle)}>
                {item.badge}
              </span>
            </div>

            {/* High-contrast Numeric KPI */}
            <div className="relative z-10 my-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-sans tracking-tight text-foreground">
                {item.value}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="relative z-10 mt-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider block truncate">
                {item.title}
              </span>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {item.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 6. Complete Distribution Analytics Card (Visual Chart + Complete Table)
// ============================================================================
interface CompleteDistributionAnalyticsCardProps {
  title: string;
  description: string;
  unit?: string;
  data: DataPoint[];
  totalStudents: number;
  distinctCountLabel?: string;
  searchPlaceholder?: string;
  categoryColumnHeader?: string;
  secondaryColumnHeader?: string;
  emptyMessage?: string;
  className?: string;
}

export function CompleteDistributionAnalyticsCard({
  title,
  description,
  unit = "students",
  data,
  totalStudents,
  distinctCountLabel = "Represented",
  searchPlaceholder = "Search categories...",
  categoryColumnHeader = "Category",
  secondaryColumnHeader = "Identifier / Code",
  emptyMessage = "No student records available",
  className
}: CompleteDistributionAnalyticsCardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");
  const [sortBy, setSortBy] = React.useState<"count_desc" | "count_asc" | "name_asc" | "name_desc">("count_desc");

  const totalInDataset = totalStudents > 0
    ? totalStudents
    : data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Filter items
  const filteredData = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const codeMatch = item.code ? item.code.toLowerCase().includes(q) : false;
      const secMatch = item.secondaryLabel ? item.secondaryLabel.toLowerCase().includes(q) : false;
      return nameMatch || codeMatch || secMatch;
    });
  }, [data, searchQuery]);

  // Sort items
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortBy === "count_desc") return b.value - a.value;
      if (sortBy === "count_asc") return a.value - b.value;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      return b.value - a.value;
    });
  }, [filteredData, sortBy]);

  const filteredTotal = React.useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [filteredData]);

  const filteredPercentage = calculatePercentage(filteredTotal, totalInDataset, 1);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card/90 p-5 sm:p-6 text-card-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-lg hover:border-border min-w-0 max-w-full overflow-hidden",
        className
      )}
    >
      {/* Title & Metadata Badges */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/40">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 whitespace-nowrap">
            {totalInDataset.toLocaleString()} Total {unit}
          </span>
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 whitespace-nowrap">
            {data.length} {distinctCountLabel}
          </span>
        </div>
      </div>

      {/* Responsive Toolbar */}
      <div className="flex flex-col gap-2.5 py-3">
        {/* Row 1: Search Input */}
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-8 sm:h-9 pl-9 pr-8 text-xs rounded-lg border border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              title="Clear search filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Row 2: Sort dropdown and View Mode toggle */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Custom Styled Sort Trigger */}
          <div className="relative flex items-center min-w-0">
            <ArrowUpDown className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 text-xs rounded-lg border border-border/60 bg-background/60 text-foreground pl-8 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <option value="count_desc">Highest Count (Desc)</option>
              <option value="count_asc">Lowest Count (Asc)</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
            </select>
          </div>

          {/* Segmented View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === "chart"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visual distribution chart view"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Complete data table view"
            >
              <Table className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[220px] min-w-0">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 gap-2">
            <Inbox className="h-7 w-7 stroke-[1.5]" />
            <span className="text-xs">{emptyMessage}</span>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 gap-2">
            <Search className="h-7 w-7 stroke-[1.5]" />
            <span className="text-xs">No matching categories found for &quot;{searchQuery}&quot;</span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80 font-medium"
            >
              Clear search filter
            </button>
          </div>
        ) : viewMode === "chart" ? (
          /* Visual Chart View: Scrollable list of 100% complete items */
          <div className="space-y-3 min-w-0">
            {/* Context bar */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1 font-medium min-w-0">
              <span className="truncate mr-2">
                Displaying {sortedData.length} of {data.length} {distinctCountLabel.toLowerCase()}
                {searchQuery && ` (filtered: ${filteredTotal} ${unit} · ${filteredPercentage})`}
              </span>
              <span className="shrink-0 whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Reconciled
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto overflow-x-hidden pr-1.5 space-y-2 custom-scrollbar">
              {sortedData.map((item, idx) => {
                const pctNumber = totalInDataset > 0 ? (item.value / totalInDataset) * 100 : 0;
                const pctFormatted = calculatePercentage(item.value, totalInDataset, 1);

                // Distinct rank pill styling for top 3 items
                const rankBadgeClass = idx === 0
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold"
                  : idx === 1
                  ? "bg-slate-400/15 text-slate-700 dark:text-slate-300 border border-slate-400/30 font-bold"
                  : idx === 2
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold"
                  : "bg-muted/50 text-muted-foreground/80 border border-border/40 font-medium";

                // Distinct gradient for progress bars
                const progressGradient = idx === 0
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : idx < 3
                  ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                  : "bg-gradient-to-r from-primary/90 to-primary/60";

                return (
                  <div
                    key={idx}
                    className="p-2 sm:p-2.5 rounded-xl border border-transparent hover:border-border/40 hover:bg-muted/25 transition-all duration-200 group space-y-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 text-center w-6", rankBadgeClass)}>
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-foreground truncate" title={item.name}>
                          {item.name}
                        </span>
                        {(item.secondaryLabel || item.code) && (
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0 px-1.5 py-0.5 rounded-md bg-muted/40 border border-border/30 whitespace-nowrap">
                            {item.secondaryLabel || item.code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right font-mono">
                        <span className="text-xs font-bold text-foreground">
                          {pctFormatted}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans whitespace-nowrap">
                          ({item.value.toLocaleString()} {unit})
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-[1px]">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300 group-hover:brightness-110", progressGradient)}
                        style={{ width: `${Math.min(100, Math.max(1.5, pctNumber))}%` }}
                        role="progressbar"
                        aria-valuenow={item.value}
                        aria-valuemin={0}
                        aria-valuemax={totalInDataset}
                        aria-label={`${item.name}: ${pctFormatted}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Data Table View: Complete, accessible tabular representation */
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1 font-medium min-w-0">
              <span className="truncate mr-2">
                Showing {sortedData.length} of {data.length} records
                {searchQuery && ` (filtered: ${filteredTotal} ${unit} · ${filteredPercentage})`}
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-foreground font-semibold">
                Reconciled: {totalInDataset.toLocaleString()} Total
              </span>
            </div>

            <div className="max-h-[380px] overflow-auto border border-border/50 rounded-xl custom-scrollbar">
              <table className="w-full min-w-[520px] text-left text-xs border-collapse">
                <thead className="bg-muted/60 backdrop-blur-md sticky top-0 z-10 border-b border-border/50 text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center font-mono">#</th>
                    <th className="py-2.5 px-3">{categoryColumnHeader}</th>
                    <th className="py-2.5 px-3 w-28">{secondaryColumnHeader}</th>
                    <th className="py-2.5 px-3 w-24 text-right">Students</th>
                    <th className="py-2.5 px-3 w-20 text-right">Share</th>
                    <th className="py-2.5 px-3 w-28 hidden md:table-cell">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sortedData.map((item, idx) => {
                    const pctNumber = totalInDataset > 0 ? (item.value / totalInDataset) * 100 : 0;
                    const pctFormatted = calculatePercentage(item.value, totalInDataset, 1);

                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-foreground">
                          <span className="truncate block max-w-[220px]" title={item.name}>
                            {item.name}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {item.secondaryLabel || item.code || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {item.value.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                          {pctFormatted}
                        </td>
                        <td className="py-2 px-3 hidden md:table-cell">
                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/80 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(2, pctNumber))}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/70 backdrop-blur-md border-t border-border/60 font-semibold text-foreground sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3">
                      Total Represented ({sortedData.length} categories)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-bold">
                      {filteredTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-bold">
                      {filteredPercentage}
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <div className="h-1.5 w-full bg-primary rounded-full" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 7. Academic Hierarchy Card (School -> Degree Level -> Course)
// ============================================================================
interface AcademicHierarchyCardProps {
  schools: AcademicHierarchySchoolNode[];
  totalStudents: number;
  emptyMessage?: string;
  className?: string;
}

export function AcademicHierarchyCard({
  schools,
  totalStudents,
  emptyMessage = "No academic hierarchy records found",
  className
}: AcademicHierarchyCardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"tree" | "matrix">("tree");
  // Track explicitly collapsed school names
  const [collapsedSchools, setCollapsedSchools] = React.useState<Record<string, boolean>>({});

  const totalInDataset = totalStudents > 0
    ? totalStudents
    : schools.reduce((acc, curr) => acc + curr.studentCount, 0);

  // Filter hierarchy based on search query
  const filteredSchools = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools;

    return schools
      .map(school => {
        const schoolMatch = school.schoolName.toLowerCase().includes(q) ||
          (school.schoolCode ? school.schoolCode.toLowerCase().includes(q) : false);

        const filteredLevels = school.levels
          .map(lvl => {
            const levelMatch = lvl.level.toLowerCase().includes(q);
            const filteredCourses = lvl.courses.filter(c =>
              c.name.toLowerCase().includes(q) || (c.code ? c.code.toLowerCase().includes(q) : false)
            );

            if (levelMatch || filteredCourses.length > 0) {
              return {
                ...lvl,
                courses: levelMatch ? lvl.courses : filteredCourses
              };
            }
            return null;
          })
          .filter(Boolean) as AcademicHierarchyLevelNode[];

        if (schoolMatch || filteredLevels.length > 0) {
          return {
            ...school,
            levels: schoolMatch ? school.levels : filteredLevels
          };
        }
        return null;
      })
      .filter(Boolean) as AcademicHierarchySchoolNode[];
  }, [schools, searchQuery]);

  const isSchoolExpanded = React.useCallback(
    (schoolName: string) => !collapsedSchools[schoolName],
    [collapsedSchools]
  );

  const toggleSchool = React.useCallback((schoolName: string) => {
    setCollapsedSchools(prev => ({
      ...prev,
      [schoolName]: !prev[schoolName]
    }));
  }, []);

  const expandAll = React.useCallback(() => {
    setCollapsedSchools({});
  }, []);

  const collapseAll = React.useCallback(() => {
    const next: Record<string, boolean> = {};
    schools.forEach(s => { next[s.schoolName] = true; });
    filteredSchools.forEach(s => { next[s.schoolName] = true; });
    setCollapsedSchools(next);
  }, [schools, filteredSchools]);

  // Flattened matrix items for table view
  const flattenedCourses = React.useMemo(() => {
    const items: Array<{
      schoolName: string;
      schoolCode?: string;
      level: string;
      courseName: string;
      courseCode?: string;
      studentCount: number;
      percentageOfSchool: number;
      percentageOfTotal: number;
    }> = [];

    filteredSchools.forEach(school => {
      school.levels.forEach(lvl => {
        lvl.courses.forEach(course => {
          items.push({
            schoolName: school.schoolName,
            schoolCode: school.schoolCode,
            level: lvl.level,
            courseName: course.name,
            courseCode: course.code,
            studentCount: course.studentCount,
            percentageOfSchool: course.percentageOfSchool,
            percentageOfTotal: course.percentageOfTotal
          });
        });
      });
    });

    return items;
  }, [filteredSchools]);

  const totalFilteredStudents = flattenedCourses.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card/90 p-5 sm:p-6 text-card-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-lg hover:border-border min-w-0 max-w-full overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <ListTree className="h-4 w-4" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
              Course-Level Academic Hierarchy & Enrollment Distribution
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Institutional structural breakdown: Academic School → Degree Level → Canonical Course
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 whitespace-nowrap">
            {totalInDataset.toLocaleString()} Total Students
          </span>
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 whitespace-nowrap">
            {schools.length} Schools
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 py-3 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school, level, or course..."
            className="w-full h-8 sm:h-9 pl-9 pr-8 text-xs rounded-lg border border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              title="Clear search filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center flex-wrap justify-between sm:justify-end gap-2 shrink-0">
          {viewMode === "tree" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer select-none active:scale-95"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer select-none active:scale-95"
              >
                Collapse All
              </button>
            </div>
          )}

          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === "tree"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Hierarchical tree view"
            >
              <ListTree className="h-3.5 w-3.5" />
              <span>Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
                viewMode === "matrix"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Tabular matrix view"
            >
              <Table className="h-3.5 w-3.5" />
              <span>Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-[250px] min-w-0">
        {schools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 gap-2">
            <Inbox className="h-7 w-7 stroke-[1.5]" />
            <span className="text-xs">{emptyMessage}</span>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 gap-2">
            <Search className="h-7 w-7 stroke-[1.5]" />
            <span className="text-xs">No matching hierarchy nodes found for &quot;{searchQuery}&quot;</span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80 font-medium"
            >
              Clear search filter
            </button>
          </div>
        ) : viewMode === "tree" ? (
          /* Tree View */
          <div className="max-h-[520px] overflow-y-auto overflow-x-hidden pr-1.5 space-y-3 custom-scrollbar">
            {filteredSchools.map((school, sIdx) => {
              const isExpanded = isSchoolExpanded(school.schoolName);

              return (
                <div
                  key={sIdx}
                  className="rounded-xl border border-border/60 bg-muted/15 overflow-hidden transition-all duration-200"
                >
                  {/* Tier 1: School Header */}
                  <div
                    onClick={() => toggleSchool(school.schoolName)}
                    className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/30 select-none transition-colors border-l-4 border-l-primary/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="p-1 rounded bg-primary/10 text-primary shrink-0">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                        {school.schoolName}
                      </span>
                      {school.schoolCode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40 shrink-0 whitespace-nowrap">
                          {school.schoolCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {school.percentageOfTotal.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ({school.studentCount} std)
                      </span>
                    </div>
                  </div>

                  {/* Tier 2 & 3: Levels & Courses */}
                  {isExpanded && (
                    <div className="px-3 sm:px-4 pb-3.5 pt-1.5 space-y-3.5 border-t border-border/30 bg-background/50">
                      {school.levels.map((levelNode, lIdx) => (
                        <div key={lIdx} className="space-y-2 pl-3 sm:pl-4 border-l-2 border-primary/30">
                          {/* Level Sub-Header */}
                          <div className="flex items-center justify-between text-xs py-1 text-muted-foreground font-medium min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                              <GraduationCap className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                              <span className="text-foreground font-bold tracking-tight truncate">{levelNode.level}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 whitespace-nowrap">
                              <span className="font-semibold text-foreground">{levelNode.studentCount} students</span>
                              <span className="text-muted-foreground/80 hidden sm:inline">
                                ({levelNode.percentageOfSchool.toFixed(1)}% faculty)
                              </span>
                            </div>
                          </div>

                          {/* Courses within Level */}
                          <div className="space-y-1.5 pl-2 sm:pl-3">
                            {levelNode.courses.map((course, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2 sm:p-2.5 rounded-xl bg-card/80 border border-border/40 hover:border-border/80 transition-all space-y-1.5 min-w-0"
                              >
                                <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                                    <span className="font-medium text-foreground truncate" title={course.name}>
                                      {course.name}
                                    </span>
                                    {course.code && (
                                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 px-1.5 py-0.5 rounded bg-muted/40 whitespace-nowrap">
                                        {course.code}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 font-mono text-right">
                                    <span className="font-bold text-foreground whitespace-nowrap">
                                      {course.studentCount} std
                                    </span>
                                    <span className="text-[10px] text-muted-foreground hidden sm:inline whitespace-nowrap">
                                      ({course.percentageOfSchool.toFixed(1)}% school · {course.percentageOfTotal.toFixed(1)}% total)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground sm:hidden whitespace-nowrap">
                                      ({course.percentageOfTotal.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>

                                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden p-[1px]">
                                  <div
                                    className="h-full bg-primary/70 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(2, (course.studentCount / totalInDataset) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Tabular Matrix View */
          <div className="space-y-2 min-w-0">
            <div className="max-h-[500px] overflow-auto border border-border/50 rounded-xl custom-scrollbar">
              <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                <thead className="bg-muted/60 backdrop-blur-md sticky top-0 z-10 border-b border-border/50 text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">School / Faculty</th>
                    <th className="py-2.5 px-3 w-36">Degree Level</th>
                    <th className="py-2.5 px-3">Course / Program</th>
                    <th className="py-2.5 px-3 w-24 text-right">Students</th>
                    <th className="py-2.5 px-3 w-24 text-right">% School</th>
                    <th className="py-2.5 px-3 w-24 text-right">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {flattenedCourses.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-foreground">
                        <span className="truncate block max-w-[200px]" title={row.schoolName}>
                          {row.schoolName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                        {row.level}
                      </td>
                      <td className="py-2 px-3 text-foreground">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate font-medium" title={row.courseName}>{row.courseName}</span>
                          {row.courseCode && (
                            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40 shrink-0 whitespace-nowrap">
                              {row.courseCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {row.studentCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {row.percentageOfSchool.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {row.percentageOfTotal.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/70 backdrop-blur-md border-t border-border/60 font-semibold text-foreground sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 font-bold">
                      Total Represented ({flattenedCourses.length} courses)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-bold">
                      {totalFilteredStudents}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">—</td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap font-bold">
                      {calculatePercentage(totalFilteredStudents, totalInDataset, 1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 8. Upcoming Expiry by Document Type Visualization
// ============================================================================
interface UpcomingExpiryByDocTypeCardProps {
  data?: UpcomingExpiryByDocTypeData;
  emptyMessage?: string;
}

export function UpcomingExpiryByDocTypeCard({
  data,
  emptyMessage = "No upcoming document expiries recorded"
}: UpcomingExpiryByDocTypeCardProps) {
  const docConfigs = [
    {
      key: "passport" as const,
      label: "Passport",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
      accentBorder: "border-l-blue-500",
      stats: data?.passport || { critical15: 0, expiring30: 0, safe: 0, expired: 0 }
    },
    {
      key: "visa" as const,
      label: "Entry Visa",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
      accentBorder: "border-l-purple-500",
      stats: data?.visa || { critical15: 0, expiring30: 0, safe: 0, expired: 0 }
    },
    {
      key: "efrro" as const,
      label: "eFRRO / Permit",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
      accentBorder: "border-l-amber-500",
      stats: data?.efrro || { critical15: 0, expiring30: 0, safe: 0, expired: 0 }
    }
  ];

  const totalDocuments = docConfigs.reduce((sum, d) => {
    return sum + d.stats.critical15 + d.stats.expiring30 + d.stats.safe + d.stats.expired;
  }, 0);

  if (totalDocuments === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
        <Inbox className="h-7 w-7 stroke-[1.5]" />
        <span className="text-xs">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
      {docConfigs.map((doc) => {
        const totalForDoc = doc.stats.critical15 + doc.stats.expiring30 + doc.stats.safe + doc.stats.expired;
        const upcoming30Only = Math.max(0, doc.stats.expiring30 - doc.stats.critical15);
        const critPct = totalForDoc > 0 ? (doc.stats.critical15 / totalForDoc) * 100 : 0;
        const warnPct = totalForDoc > 0 ? (upcoming30Only / totalForDoc) * 100 : 0;
        const safePct = totalForDoc > 0 ? (doc.stats.safe / totalForDoc) * 100 : 0;
        const expPct = totalForDoc > 0 ? (doc.stats.expired / totalForDoc) * 100 : 0;

        return (
          <div
            key={doc.key}
            className={cn(
              "p-3.5 rounded-lg border border-border/50 bg-card/60 hover:bg-card transition-all border-l-4 space-y-2.5 shadow-xs",
              doc.accentBorder
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", doc.badgeClass)}>
                  {doc.label}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {totalForDoc.toLocaleString()} managed
                </span>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                {doc.stats.critical15 > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-semibold">
                    {doc.stats.critical15} critical (0–15d)
                  </span>
                )}
                {upcoming30Only > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {upcoming30Only} upcoming (16–30d)
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {doc.stats.safe} valid (31+d)
                </span>
                {doc.stats.expired > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold">
                    {doc.stats.expired} expired
                  </span>
                )}
              </div>
            </div>

            {/* Proportional Segmented Progress Bar */}
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden flex gap-0.5">
              {doc.stats.expired > 0 && (
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${expPct}%` }}
                  title={`Expired: ${doc.stats.expired}`}
                />
              )}
              {doc.stats.critical15 > 0 && (
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ width: `${critPct}%` }}
                  title={`Critical (0-15d): ${doc.stats.critical15}`}
                />
              )}
              {upcoming30Only > 0 && (
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${warnPct}%` }}
                  title={`Upcoming (16-30d): ${upcoming30Only}`}
                />
              )}
              {doc.stats.safe > 0 && (
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${safePct}%` }}
                  title={`Valid (31+d): ${doc.stats.safe}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


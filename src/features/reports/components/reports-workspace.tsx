"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Globe,
  School,
  GraduationCap,
  Building2,
  Calendar,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Bell,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DimensionalReportsData,
  DimensionReportFilters,
  ExportableDimensionType,
} from "@/domain/reports/types/dimensional-reports";
import { ReportsFilterBar } from "./reports-filter-bar";
import { DimensionCard } from "./dimension-card";
import {
  getDimensionalReportsAction,
  exportDimensionalReportExcelAction,
} from "@/app/(app)/reports/actions";
import { toast } from "sonner";

interface ReportsWorkspaceProps {
  initialData: DimensionalReportsData;
}

function downloadBase64File(base64: string, fileName: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function ReportsWorkspace({ initialData }: ReportsWorkspaceProps) {
  const [data, setData] = React.useState<DimensionalReportsData>(initialData);
  const [filters, setFilters] = React.useState<DimensionReportFilters>({});
  const [isPending, startTransition] = React.useTransition();
  const [exportingDim, setExportingDim] = React.useState<string | null>(null);
  const [isExportAllPending, setIsExportAllPending] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "demographics" | "academics" | "compliance">("all");

  // Handle filter changes
  const handleFilterChange = (newFilters: DimensionReportFilters) => {
    setFilters(newFilters);
    startTransition(async () => {
      try {
        const updatedData = await getDimensionalReportsAction(newFilters);
        setData(updatedData);
      } catch (err: any) {
        toast.error(err.message || "Failed to update reports with filters.");
      }
    });
  };

  const handleResetFilters = () => {
    setFilters({});
    startTransition(async () => {
      try {
        const updatedData = await getDimensionalReportsAction({});
        setData(updatedData);
        toast.info("All reporting filters cleared.");
      } catch (err: any) {
        toast.error(err.message || "Failed to reset reports.");
      }
    });
  };

  // Handle single dimension Excel export
  const handleExportSingleExcel = async (dimension: ExportableDimensionType) => {
    setExportingDim(dimension);
    try {
      const res = await exportDimensionalReportExcelAction(dimension, filters);
      if (res.success && res.base64) {
        downloadBase64File(res.base64, res.fileName, res.mimeType);
        toast.success(`Exported ${res.fileName}`);
      } else {
        toast.error("Failed to generate Excel file.");
      }
    } catch (err: any) {
      toast.error(err.message || "Export error.");
    } finally {
      setExportingDim(null);
    }
  };

  // Handle Export All 12-sheet Excel Workbook
  const handleExportAllExcel = async () => {
    setIsExportAllPending(true);
    try {
      const res = await exportDimensionalReportExcelAction("all", filters);
      if (res.success && res.base64) {
        downloadBase64File(res.base64, res.fileName, res.mimeType);
        toast.success(`Comprehensive workbook downloaded (${res.fileName})`);
      } else {
        toast.error("Failed to generate combined workbook.");
      }
    } catch (err: any) {
      toast.error(err.message || "Export All error.");
    } finally {
      setIsExportAllPending(false);
    }
  };

  const overview = data.overview;
  const compliantPct =
    overview.totalStudents > 0
      ? ((overview.totalFullyCompliant / overview.totalStudents) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* ── TOP HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Institutional Reports & Analytics Engine
            </h1>
            <Badge
              variant="outline"
              className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium text-xs px-2 py-0.5"
            >
              Administrator Only
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            National Forensic Sciences University • Granular dimensional breakdown, audit tracking, and multi-format exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportAllExcel}
            disabled={isExportAllPending || isPending}
            className="h-9 px-4 text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            {isExportAllPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export All Reports (.xlsx)
          </Button>
        </div>
      </div>

      {/* ── KPI OVERVIEW CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          {
            id: "students",
            label: "Total Students",
            value: overview.totalStudents,
            subValue: null,
            caption: "Matching active filters",
            icon: Users,
            iconColor: "text-blue-600 dark:text-blue-400",
            iconBg: "bg-blue-500/10",
          },
          {
            id: "countries",
            label: "Countries",
            value: overview.totalCountries,
            subValue: null,
            caption: "Sovereign nationalities",
            icon: Globe,
            iconColor: "text-indigo-600 dark:text-indigo-400",
            iconBg: "bg-indigo-500/10",
          },
          {
            id: "campuses",
            label: "NFSU Campuses",
            value: overview.totalCampuses,
            subValue: null,
            caption: "University campuses",
            icon: Building2,
            iconColor: "text-cyan-600 dark:text-cyan-400",
            iconBg: "bg-cyan-500/10",
          },
          {
            id: "schools",
            label: "Schools",
            value: overview.totalSchools,
            subValue: null,
            caption: "Academic schools",
            icon: School,
            iconColor: "text-purple-600 dark:text-purple-400",
            iconBg: "bg-purple-500/10",
          },
          {
            id: "programs",
            label: "Programs",
            value: overview.totalPrograms,
            subValue: null,
            caption: "Degree programs",
            icon: GraduationCap,
            iconColor: "text-amber-600 dark:text-amber-400",
            iconBg: "bg-amber-500/10",
          },
          {
            id: "compliant",
            label: "Fully Compliant",
            value: overview.totalFullyCompliant,
            subValue: `(${compliantPct}%)`,
            caption: "Valid > 30 days",
            icon: ShieldCheck,
            iconColor: "text-emerald-600 dark:text-emerald-400",
            iconBg: "bg-emerald-500/10",
          },
          {
            id: "renewals",
            label: "Renewals",
            value: overview.totalRenewals,
            subValue: null,
            caption: "Extensions (v > 1)",
            icon: RefreshCw,
            iconColor: "text-rose-600 dark:text-rose-400",
            iconBg: "bg-rose-500/10",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.id}
              className="p-3 border-border/70 bg-card shadow-2xs flex flex-col justify-between h-full min-h-[124px]"
            >
              {/* Header: Fixed height for exact horizontal alignment */}
              <div className="flex items-center gap-2 h-9 min-h-[36px]">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/30",
                    kpi.iconBg,
                    kpi.iconColor
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                  {kpi.label}
                </span>
              </div>

              {/* Value Row: Fixed height, baseline aligned for identical number level */}
              <div className="my-1 flex items-baseline gap-1.5 h-7">
                <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                  {kpi.value}
                </span>
                {kpi.subValue && (
                  <span className="text-xs font-mono text-muted-foreground font-normal">
                    {kpi.subValue}
                  </span>
                )}
              </div>

              {/* Caption: Fixed height, top aligned */}
              <div className="h-6 flex items-start">
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {kpi.caption}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── GLOBAL FILTER BAR ──────────────────────────────────────────────── */}
      <ReportsFilterBar
        options={data.filterOptions}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        isPending={isPending}
      />

      {/* ── CATEGORY TABS / QUICK FILTER ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Dimensions (11)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("demographics")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "demographics"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Demographics & Admissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("academics")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "academics"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Academic Structure
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compliance")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "compliance"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Compliance & Validity
          </button>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Updating dimensional figures...
          </div>
        )}
      </div>

      {/* ── DIMENSIONAL REPORTS CARDS GRID ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. Country-wise */}
        {(activeTab === "all" || activeTab === "demographics") && (
          <DimensionCard
            dimension="country"
            title="Country-wise Distribution"
            description="Geographic representation of international students by sovereign country of origin."
            data={data.reports.country}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "country"}
          />
        )}

        {/* 2. Category-wise */}
        {(activeTab === "all" || activeTab === "demographics") && (
          <DimensionCard
            dimension="category"
            title="Admission Category Distribution"
            description="Breakdown of admissions across ICCR Scholarship, Study in India (SII), and Self-Financed."
            data={data.reports.category}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "category"}
          />
        )}

        {/* 3. Academic School-wise */}
        {(activeTab === "all" || activeTab === "academics") && (
          <DimensionCard
            dimension="school"
            title="Academic School-wise Distribution"
            description="Enrolled student volume distributed across NFSU academic schools."
            data={data.reports.school}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "school"}
          />
        )}

        {/* 4. Academic Program-wise */}
        {(activeTab === "all" || activeTab === "academics") && (
          <DimensionCard
            dimension="program"
            title="Academic Program & Course-wise Enrollment"
            description="Enrollment totals across individual undergraduate, postgraduate, and doctoral degree programs."
            data={data.reports.program}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "program"}
          />
        )}

        {/* 5. Scholarship / Funding Type-wise */}
        {(activeTab === "all" || activeTab === "demographics") && (
          <DimensionCard
            dimension="funding"
            title="Scholarship & Funding Type Distribution"
            description="Distribution of financial sponsorship schemes and self-financed student accounts."
            data={data.reports.funding}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "funding"}
          />
        )}

        {/* 6. Campus-wise */}
        {(activeTab === "all" || activeTab === "academics") && (
          <DimensionCard
            dimension="campus"
            title="NFSU Campus-wise Distribution"
            description="Geographic allocation of foreign students across NFSU main headquarters and regional campuses."
            data={data.reports.campus}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "campus"}
          />
        )}

        {/* 7. Academic Year-wise */}
        {(activeTab === "all" || activeTab === "demographics") && (
          <DimensionCard
            dimension="academicYear"
            title="Admission / Academic Year Intake"
            description="Yearly student cohort volume tracking intake trends across academic cycles."
            data={data.reports.academicYear}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "academicYear"}
          />
        )}

        {/* 8. Student Status-wise */}
        {(activeTab === "all" || activeTab === "demographics") && (
          <DimensionCard
            dimension="studentStatus"
            title="Student Status Distribution"
            description="Current enrollment status breakdown (Active, Graduated, Withdrawn, Suspended)."
            data={data.reports.studentStatus}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "studentStatus"}
          />
        )}

        {/* 9. Compliance-wise */}
        {(activeTab === "all" || activeTab === "compliance") && (
          <DimensionCard
            dimension="compliance"
            title="Authoritative Compliance Status Distribution"
            description="Fail-closed positive compliance evaluation based on active Passport, Visa, and eFRRO records."
            data={data.reports.compliance}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "compliance"}
          />
        )}

        {/* 10. Document Status Breakdown */}
        {(activeTab === "all" || activeTab === "compliance") && (
          <DimensionCard
            dimension="documentStatus"
            title="Document Validity & Status Breakdown"
            description="Health status across Passport, Visa, and eFRRO (Valid >30d, Upcoming 16–30d, Critical 0–15d, Expired, Missing)."
            data={data.reports.documentStatus}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "documentStatus"}
          />
        )}

        {/* 11. Authoritative Document Renewals */}
        {(activeTab === "all" || activeTab === "compliance") && (
          <DimensionCard
            dimension="renewals"
            title="Authoritative Document Renewal History"
            description="Positively verified renewal versions (> 1 strictly; original versions contribute 0 renewals)."
            data={data.reports.renewals}
            totalStudents={overview.totalStudents}
            filters={filters}
            onExportExcel={handleExportSingleExcel}
            isExcelExporting={exportingDim === "renewals"}
          />
        )}
      </div>

      {/* ── OPERATIONAL REGISTRY & AUDIT REPORTS BANNER ────────────────────────── */}
      <div className="pt-6 border-t border-border/50">
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase">
            Operational Registry & Audit Log Reports
          </h2>
          <p className="text-xs text-muted-foreground">
            Search, filter, paginate, and audit individual student records, reminder dispatches, and compliance logs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/reports/students" className="group">
            <Card className="h-full border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all p-3.5 bg-card">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <Users className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">
                Student Registry
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                Search, filter, paginate, and export full international student registries.
              </p>
            </Card>
          </Link>

          <Link href="/reports/efrro" className="group">
            <Card className="h-full border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all p-3.5 bg-card">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">
                eFRRO Expiry & Compliance
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                Track visa extension dates, upload statuses, and expiry intervals.
              </p>
            </Card>
          </Link>

          <Link href="/reports/notifications" className="group">
            <Card className="h-full border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all p-3.5 bg-card">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                  <Bell className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">
                Notification Logs
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                Monitor automated reminder schedules, delivery channels, and logs.
              </p>
            </Card>
          </Link>

          <Link href="/reports/audit" className="group">
            <Card className="h-full border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all p-3.5 bg-card">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">
                Security Audit Trail
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                Trace export actions, admin activities, and compliance data access.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

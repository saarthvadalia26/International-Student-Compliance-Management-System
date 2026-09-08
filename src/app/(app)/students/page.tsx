"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Search, 
  UserPlus, 
  X, 
  MoreHorizontal,
  Eye,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Building2,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/ui/country-flag";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { ACADEMIC_LEVEL_OPTIONS, normalizeAcademicLevel } from "@/domain/academic-programs/academic-level";
import { matchStudentFilters, StudentExportFilterCriteria } from "@/domain/students/utils/student-filter.util";
import { useRouter, useSearchParams } from "next/navigation";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { useUserRole } from "@/hooks/use-user-role";
import { getStudentsListAction, exportStudentsExcelAction, StudentListItem } from "@/app/(app)/students/actions";
import { getActiveCampusesAction } from "@/app/(app)/settings/campus-actions";
import { Campus } from "@/domain/campuses/types";

export type Student = StudentListItem;

import { formatDate } from "@/lib/utils/date";

function formatDateDisplay(d?: string | null): string {
  return formatDate(d);
}

export default function StudentListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdministrator } = useUserRole();
  const [searchQuery, setSearchQuery] = React.useState("");

  const initialCompliance = (searchParams.get("compliance") || searchParams.get("status") || "all").toLowerCase();
  const [complianceFilter, setComplianceFilter] = React.useState<string>(
    ["compliant", "warning", "critical", "expired", "missing"].includes(initialCompliance) ? initialCompliance : "all"
  );

  React.useEffect(() => {
    const p = (searchParams.get("compliance") || searchParams.get("status") || "").toLowerCase();
    if (p && ["compliant", "warning", "critical", "expired", "missing"].includes(p)) {
      setComplianceFilter(p);
    }
  }, [searchParams]);
  const [academicFilter, setAcademicFilter] = React.useState<string>("all");
  const [academicLevelFilter, setAcademicLevelFilter] = React.useState<string>("all");
  const [campusFilter, setCampusFilter] = React.useState<string>("all");
  const [admissionYearFilter, setAdmissionYearFilter] = React.useState<string>("all");
  const [feePaymentCategoryFilter, setFeePaymentCategoryFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const loadStudents = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await getStudentsListAction();
      if (res.success && res.students) {
        setStudents(res.students);
      } else {
        setLoadError(res.error || "Unable to retrieve student records from database.");
      }
    } catch (err: unknown) {
      console.error("[STUDENT_DIRECTORY] Failed loading students:", err);
      setLoadError("An unexpected error occurred while loading international student records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Realtime Live Sync: Refresh server component data when students, passports, visas, or snapshots change
  useRealtimeSubscription({ 
    table: "students", 
    onEvent: () => {
      loadStudents();
      router.refresh();
    } 
  });
  useRealtimeSubscription({ 
    table: "student_personal", 
    onEvent: () => {
      loadStudents();
      router.refresh();
    } 
  });
  useRealtimeSubscription({ 
    table: "student_academic", 
    onEvent: () => {
      loadStudents();
      router.refresh();
    } 
  });
  useRealtimeSubscription({ 
    table: "student_snapshot", 
    onEvent: () => {
      loadStudents();
      router.refresh();
    } 
  });

  // Load centralized master-data campuses
  const [masterCampuses, setMasterCampuses] = React.useState<Campus[]>([]);

  React.useEffect(() => {
    getActiveCampusesAction().then((res) => {
      if (res.success && res.campuses) {
        setMasterCampuses(res.campuses);
      }
    });
  }, []);

  // Dynamically derive available campuses from centralized Master Data with student counts
  const availableCampuses = React.useMemo(() => {
    const campusCounts = new Map<string, number>();
    let notSpecifiedCount = 0;

    // Seed master campuses so staff can filter by any master-data campus
    masterCampuses.forEach((mc) => {
      campusCounts.set(mc.name, 0);
    });

    students.forEach((s) => {
      const c = s.nfsuCampus?.trim();
      if (c) {
        // Resolve against master campuses (case-insensitive)
        const masterMatch = masterCampuses.find(mc => mc.name.toLowerCase() === c.toLowerCase());
        const canonicalName = masterMatch ? masterMatch.name : c;
        campusCounts.set(canonicalName, (campusCounts.get(canonicalName) || 0) + 1);
      } else {
        notSpecifiedCount++;
      }
    });

    // Campuses with students first, then alphabetical
    const sortedCampuses = Array.from(campusCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.count > 0 && b.count === 0) return -1;
        if (a.count === 0 && b.count > 0) return 1;
        return a.name.localeCompare(b.name);
      });

    return { list: sortedCampuses, notSpecifiedCount };
  }, [students, masterCampuses]);

  // Dynamically derive available admission years
  const availableAdmissionYears = React.useMemo(() => {
    const years = new Set<string>();
    students.forEach((s) => {
      if (s.admissionAcademicYear?.trim()) {
        years.add(s.admissionAcademicYear.trim());
      } else if (s.admissionDate) {
        try {
          const y = new Date(s.admissionDate).getFullYear();
          if (y && !isNaN(y)) years.add(String(y));
        } catch {}
      }
    });
    return Array.from(years).sort().reverse();
  }, [students]);

  // Determine whether any filtering is currently active
  const isFilterActive = Boolean(
    (searchQuery && searchQuery.trim() !== "") ||
    complianceFilter !== "all" ||
    academicFilter !== "all" ||
    academicLevelFilter !== "all" ||
    campusFilter !== "all" ||
    admissionYearFilter !== "all" ||
    feePaymentCategoryFilter !== "all"
  );

  // Authoritative filter logic utilizing shared domain matcher
  const filteredStudents = React.useMemo(() => {
    const filterCriteria: StudentExportFilterCriteria = {
      searchQuery,
      complianceFilter,
      academicFilter,
      academicLevelFilter,
      campusFilter,
      admissionYearFilter,
      feePaymentCategoryFilter,
      scope: "filtered"
    };

    return students.filter((student) =>
      matchStudentFilters(
        {
          fullName: student.fullName,
          registrationNumber: student.registrationNumber,
          nationalityCode: student.nationalityCode,
          nationalityName: student.nationalityName,
          programName: student.programName,
          programCode: student.programCode,
          programId: student.programId,
          academicLevel: student.academicLevel,
          academicLevelLabel: student.academicLevelLabel,
          admissionAcademicYear: student.admissionAcademicYear,
          school: student.school,
          admissionCategory: student.admissionCategory,
          iccrApplicationNumber: student.iccrApplicationNumber,
          siiApplicationNumber: student.siiApplicationNumber,
          nfsuCampus: student.nfsuCampus,
          feePaymentCategory: student.feePaymentCategory,
          passportNumber: student.passport?.number,
          visaNumber: student.visa?.number,
          efrroNumber: student.efrro?.number,
          email: student.email,
          complianceStatus: student.complianceStatus,
          academicStatus: student.academicStatus
        },
        filterCriteria
      )
    );
  }, [students, searchQuery, complianceFilter, academicFilter, academicLevelFilter, campusFilter, admissionYearFilter, feePaymentCategoryFilter]);

  // Download filtered or full student directory as formatted Excel workbook (.xlsx)
  const handleExport = async (scope: "filtered" | "all" = "filtered") => {
    if (isExporting) return;
    if (scope === "filtered" && filteredStudents.length === 0) {
      toast.error("No students match the current filters.");
      return;
    }
    if (students.length === 0) {
      toast.error("No student records available to export.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Preparing Excel export...");
    try {
      const criteria: StudentExportFilterCriteria = {
        searchQuery,
        complianceFilter,
        academicFilter,
        academicLevelFilter,
        campusFilter,
        admissionYearFilter,
        feePaymentCategoryFilter,
        scope
      };

      const res = await exportStudentsExcelAction(criteria);
      if (res.success && res.base64 && res.fileName) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: res.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Export completed: ${res.count ?? (scope === "all" ? students.length : filteredStudents.length)} students downloaded (${res.fileName})`, { id: toastId });
      } else {
        toast.error(res.error || "Failed to generate Excel export. Please try again.", { id: toastId });
      }
    } catch (err) {
      console.error("[STUDENT_EXCEL_EXPORT_ERROR]", err);
      toast.error("An unexpected error occurred while preparing the Excel file.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setComplianceFilter("all");
    setAcademicFilter("all");
    setAcademicLevelFilter("all");
    setCampusFilter("all");
    setAdmissionYearFilter("all");
    setFeePaymentCategoryFilter("all");
    setCurrentPage(1);
  };

  // Pagination bounds
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedStudents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Helper to determine exact missing required documents for a student
  const getMissingDocuments = (student: Student): string[] => {
    if (student.missingDocuments && student.missingDocuments.length > 0) {
      return student.missingDocuments;
    }

    const missing: string[] = [];

    const isPassportMissing =
      student.passport?.status === "MISSING" ||
      !student.passport?.number ||
      student.passport.number.trim().toLowerCase() === "not provided" ||
      student.passport.number.trim() === "" ||
      !student.passport?.expiry;
    if (isPassportMissing) {
      missing.push("Passport");
    }

    const isVisaMissing =
      student.visa?.status === "MISSING" ||
      !student.visa?.number ||
      student.visa.number.trim().toLowerCase() === "not provided" ||
      student.visa.number.trim() === "" ||
      !student.visa?.expiry;
    if (isVisaMissing) {
      missing.push("Visa");
    }

    const isEfrroMissing =
      student.efrro?.status === "MISSING" ||
      !student.efrro?.number ||
      student.efrro.number.trim().toLowerCase() === "not provided" ||
      student.efrro.number.trim() === "" ||
      !student.efrro?.expiry;
    if (isEfrroMissing) {
      missing.push("eFRRO");
    }

    return missing;
  };

  // Overall compliance badge renderer
  const renderOverallComplianceBadge = (student: Student) => {
    const rawStatus = (student.rawComplianceStatus || "").toUpperCase();
    const mappedStatus = student.complianceStatus;

    if (rawStatus === "EXPIRED" || mappedStatus === "expired") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25 whitespace-nowrap shadow-2xs">
          <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>Expired</span>
        </span>
      );
    }

    if (rawStatus === "WARNING" || mappedStatus === "warning") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Expiring Soon</span>
        </span>
      );
    }

    if (rawStatus === "PENDING_VERIFICATION") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 whitespace-nowrap shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Pending Review</span>
        </span>
      );
    }

    if (rawStatus === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25 whitespace-nowrap shadow-2xs">
          <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>Rejected</span>
        </span>
      );
    }

    if (rawStatus === "COMPLIANT" && mappedStatus === "compliant") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Fully Compliant</span>
        </span>
      );
    }

    // Determine missing documents to show exact missing permit instead of generic "Incomplete"
    const missingDocs = getMissingDocuments(student);
    let badgeText = "Missing Documents";
    let tooltipText = "";

    if (missingDocs.length === 1) {
      badgeText = `Missing ${missingDocs[0]}`;
      tooltipText = `Missing required document: ${missingDocs[0]}`;
    } else if (missingDocs.length === 2) {
      badgeText = `Missing ${missingDocs[0]} & ${missingDocs[1]}`;
      tooltipText = `Missing required documents: ${missingDocs[0]} and ${missingDocs[1]}`;
    } else if (missingDocs.length === 3) {
      badgeText = "Missing Passport, Visa & eFRRO";
      tooltipText = "Missing all required documents: Passport, Visa, and eFRRO";
    } else {
      badgeText = "Incomplete";
      tooltipText = "Required compliance documents are incomplete";
    }

    return (
      <span 
        title={tooltipText}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-2xs"
      >
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{badgeText}</span>
      </span>
    );
  };

  const getAcademicStatusBadge = (status: Student["academicStatus"]) => {
    switch (status) {
      case "good_standing":
        return <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-medium text-[10px] px-2.5 py-0.5 whitespace-nowrap">Good Standing</Badge>;
      case "probation":
        return <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 font-medium text-[10px] px-2.5 py-0.5 whitespace-nowrap">Probation</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium text-[10px] px-2.5 py-0.5 whitespace-nowrap">Suspended</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 whitespace-nowrap">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full min-w-0">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="tracking-tight text-foreground text-2xl font-bold font-display">International Student Directory</h1>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
              {students.length} Registered
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Centralized administrative directory for monitoring immigration compliance, document validity, and academic standing across all NFSU campuses.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Export Excel Action — Administrator Only */}
          {isAdministrator && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isExporting || students.length === 0}
                  className="h-9 gap-1.5 border-border hover:bg-muted/50 text-xs font-medium"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Preparing Excel...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span>Export Excel</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
                    </>
                  )}
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-[260px]">
                <DropdownMenuLabel className="text-xs font-semibold">Student Excel Export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isExporting || filteredStudents.length === 0}
                  onClick={() => handleExport("filtered")}
                  className="text-xs cursor-pointer flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    {isFilterActive ? "Export Filtered Students" : "Export All Students"}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {filteredStudents.length}
                  </Badge>
                </DropdownMenuItem>
                {isFilterActive && (
                  <DropdownMenuItem
                    disabled={isExporting || students.length === 0}
                    onClick={() => handleExport("all")}
                    className="text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      Export All Students
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {students.length}
                    </Badge>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Bulk Import Action — Administrator Only */}
          {isAdministrator && (
            <Link href="/students/import" passHref>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border hover:bg-muted/50 text-xs font-medium">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Bulk Import
              </Button>
            </Link>
          )}

          {/* Register Student — Permitted for both Administrator and Staff */}
          <Link href="/students/add" passHref>
            <Button size="sm" className="h-9 shrink-0 text-xs font-medium shadow-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="mr-1.5 h-4 w-4" /> Register Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search Controls Card */}
      <Card className="border border-border/70 shadow-sm bg-card rounded-xl">
        <CardContent className="p-4 flex flex-col gap-3.5">
          {/* Row 1: Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, enrollment ID, NFSU campus, nationality, passport, visa, or eFRRO number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-9 h-9 text-sm w-full bg-background"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 hover:text-foreground text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Row 2: Responsive Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 w-full">
            {/* Campus Filter */}
            <div className="min-w-0">
              <Select 
                value={campusFilter} 
                onValueChange={(val) => {
                  setCampusFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="NFSU Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {availableCampuses.list.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </SelectItem>
                  ))}
                  {availableCampuses.notSpecifiedCount > 0 && (
                    <SelectItem value="not_specified">
                      Unspecified Campus ({availableCampuses.notSpecifiedCount})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Compliance Filter */}
            <div className="min-w-0">
              <Select 
                value={complianceFilter} 
                onValueChange={(val) => {
                  setComplianceFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="Compliance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance Statuses</SelectItem>
                  <SelectItem value="compliant">Fully Compliant</SelectItem>
                  <SelectItem value="missing">Missing Documents / Incomplete</SelectItem>
                  <SelectItem value="warning">Expiring Soon (30 Days)</SelectItem>
                  <SelectItem value="critical">Expired / Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Academic Level Filter */}
            <div className="min-w-0">
              <Select 
                value={academicLevelFilter} 
                onValueChange={(val) => {
                  setAcademicLevelFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="Academic Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Levels</SelectItem>
                  {ACADEMIC_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admission Academic Year Filter */}
            <div className="min-w-0">
              <Select 
                value={admissionYearFilter} 
                onValueChange={(val) => {
                  setAdmissionYearFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Years</SelectItem>
                  {availableAdmissionYears.map((yr) => (
                    <SelectItem key={yr} value={yr}>
                      Year {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Standing Filter */}
            <div className="min-w-0">
              <Select 
                value={academicFilter} 
                onValueChange={(val) => {
                  setAcademicFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="Academic Standing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Standings</SelectItem>
                  <SelectItem value="good_standing">Good Standing</SelectItem>
                  <SelectItem value="probation">Academic Probation</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Funding Category Filter */}
            <div className="min-w-0">
              <Select 
                value={feePaymentCategoryFilter} 
                onValueChange={(val) => {
                  setFeePaymentCategoryFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background font-medium">
                  <SelectValue placeholder="Funding Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funding Types</SelectItem>
                  <SelectItem value="self_financed">Self Financed</SelectItem>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="not_specified">Not Specified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Summary and Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-border/40 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {isFilterActive ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5">
                    {filteredStudents.length}
                  </Badge>
                  <span className="font-medium text-foreground">
                    {filteredStudents.length === 1 ? "student matches your filters" : "students match your filters"}
                  </span>
                  <span className="text-muted-foreground">
                    (out of {students.length} total)
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Showing all <span className="font-medium text-foreground">{students.length}</span> registered international students
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isFilterActive && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Reset Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting || filteredStudents.length === 0}
                onClick={() => handleExport(isFilterActive ? "filtered" : "all")}
                className="h-8 text-xs gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    <span>Preparing Excel...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Export {isFilterActive ? `Filtered (${filteredStudents.length})` : `All (${students.length})`}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Student Directory Table Container */}
      <Card className="border border-border/70 shadow-sm overflow-hidden rounded-xl bg-card">
        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-semibold text-sm text-foreground">Loading international student records...</p>
              <p className="text-xs text-muted-foreground">Synchronizing Passport, Visa, and eFRRO compliance statuses</p>
            </div>
          </div>
        ) : loadError ? (
          /* Error State with Retry */
          <div className="py-16 text-center px-4">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3 max-w-md mx-auto">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Failed to Load Student Records</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{loadError}</p>
              <Button size="sm" onClick={loadStudents} className="mt-2 text-xs h-8 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
              </Button>
            </div>
          </div>
        ) : paginatedStudents.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center px-4">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2.5 max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                {isFilterActive ? "No matching students found" : "No students registered yet"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isFilterActive 
                  ? "No international students match your current search and filter parameters." 
                  : "Get started by registering a new international student profile or importing an Excel roster."}
              </p>
              {isFilterActive ? (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs h-8">
                  Clear all filters
                </Button>
              ) : (
                <Link href="/students/add" passHref>
                  <Button size="sm" className="mt-2 text-xs h-8 gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Register First Student
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Desktop Full-Density Administrative Table (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1060px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/70 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 font-semibold w-[26%] min-w-[220px]">1. Student</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold w-[24%] min-w-[200px]">2. Academic Info</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold w-[18%] min-w-[180px]">3. Campus</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold w-[18%] min-w-[190px]">4. Compliance</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold w-[14%] min-w-[130px]">5. Status</th>
                    <th scope="col" className="py-3.5 px-4 font-semibold text-right w-[110px] min-w-[110px]">6. Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {paginatedStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* 1. Student Identity */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs font-display border border-primary/20 mt-0.5">
                            {student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-1 min-w-0 max-w-[210px]">
                            <Link 
                              href={`/students/${student.id}`} 
                              className="text-xs font-bold text-foreground hover:text-primary transition-colors block truncate group-hover:text-primary leading-tight"
                              title={student.fullName}
                            >
                              {student.fullName}
                            </Link>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground font-mono font-medium">
                                {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "Pending Reg ID"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {student.nationalityCode && (
                                <CountryFlag countryCode={student.nationalityCode} size="sm" />
                              )}
                              <span className="truncate">{student.nationalityName || "International"}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {student.admissionCategory && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal border-border/80 bg-muted/40">
                                  {student.admissionCategory}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Academic Info */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 min-w-0 max-w-[200px]">
                          <div 
                            className="text-xs font-semibold text-foreground leading-snug line-clamp-2" 
                            title={student.programName}
                          >
                            {student.programName}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {student.academicLevelLabel && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                                {student.academicLevelLabel}
                              </Badge>
                            )}
                            {student.admissionAcademicYear && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                AY {student.admissionAcademicYear}
                              </span>
                            )}
                          </div>
                          {student.school && (
                            <p className="text-[10px] text-muted-foreground truncate" title={student.school}>
                              {student.school}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. NFSU Campus */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="min-w-0">
                          {student.nfsuCampus ? (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] px-2.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-medium inline-flex items-center gap-1.5 max-w-full shrink min-w-0"
                              title={student.nfsuCampus}
                            >
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{student.nfsuCampus}</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/70 italic">
                              Not Assigned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Overall Compliance */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="min-w-0">
                          {renderOverallComplianceBadge(student)}
                        </div>
                      </td>

                      {/* 5. Academic Standing */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="min-w-0">
                          {getAcademicStatusBadge(student.academicStatus)}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/students/${student.id}`} passHref>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs px-2.5 gap-1 border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary font-medium"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span>View</span>
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-[170px]">
                              <DropdownMenuLabel className="text-xs font-semibold">Student Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs cursor-pointer"
                                render={
                                  <Link href={`/students/${student.id}`} />
                                }
                              >
                                <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Student Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs cursor-pointer"
                                render={
                                  <Link href={`/students/${student.id}?tab=documents`} />
                                }
                              >
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Renew Documents
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive Student
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Structured Responsive Cards (< 1024px) */}
            <div className="block lg:hidden divide-y divide-border/40">
              {paginatedStudents.map((student) => (
                <div key={student.id} className="p-4 space-y-3.5 hover:bg-muted/20 transition-colors">
                  {/* Top Bar: Identity & Primary Compliance Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs font-display border border-primary/20 mt-0.5">
                        {student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Link 
                          href={`/students/${student.id}`} 
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors block break-words"
                        >
                          {student.fullName}
                        </Link>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                          <span className="font-mono">{student.registrationNumber || "No ID"}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {student.nationalityCode && <CountryFlag countryCode={student.nationalityCode} size="sm" />}
                            <span>{student.nationalityName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {renderOverallComplianceBadge(student)}
                    </div>
                  </div>

                  {/* Academic & Campus Information */}
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground line-clamp-1">{student.programName}</span>
                      {student.nfsuCampus && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 shrink-0">
                          {student.nfsuCampus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      {student.school && <span>{student.school}</span>}
                      {student.academicLevelLabel && (
                        <>
                          <span>•</span>
                          <span>{student.academicLevelLabel}</span>
                        </>
                      )}
                      {student.admissionAcademicYear && (
                        <>
                          <span>•</span>
                          <span>AY {student.admissionAcademicYear}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Standing & View Button */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      {getAcademicStatusBadge(student.academicStatus)}
                      {student.admissionCategory && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {student.admissionCategory}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/students/${student.id}`} passHref>
                        <Button size="sm" variant="outline" className="h-8 text-xs px-3 gap-1 border-primary/30 text-primary hover:bg-primary/5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Profile</span>
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-[170px]">
                          <DropdownMenuLabel className="text-xs font-semibold">Student Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            render={
                              <Link href={`/students/${student.id}`} />
                            }
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Student Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            render={
                              <Link href={`/students/${student.id}?tab=documents`} />
                            }
                          >
                            <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Renew Documents
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-border/60 bg-muted/20 text-xs">
                <p className="text-muted-foreground text-center sm:text-left">
                  Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
                  <span className="font-medium text-foreground">{totalItems}</span> students
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" /> Previous
                  </Button>
                  <div className="flex items-center px-2 font-medium text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2 text-xs"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

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
  Loader2,
  FileSpreadsheet,
  Download,
  ChevronDown,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/ui/country-flag";
import { Card, CardContent } from "@/components/ui/card";
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

export interface Student {
  id: string;
  fullName: string;
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  programName: string;
  programCode?: string | null;
  programId?: string | null;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  school: string;
  admissionCategory?: string | null;
  iccrApplicationNumber?: string | null;
  siiApplicationNumber?: string | null;
  nfsuCampus?: string | null;
  feePaymentCategory?: string | null;
  passport: { number: string };
  visa: { number: string };
  email: string;
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  academicStatus: "good_standing" | "probation" | "suspended";
}

import { useRouter } from "next/navigation";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { getStudentsListAction, exportStudentsExcelAction } from "@/app/(app)/students/actions";

export default function StudentListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [complianceFilter, setComplianceFilter] = React.useState<string>("all");
  const [academicFilter, setAcademicFilter] = React.useState<string>("all");
  const [academicLevelFilter, setAcademicLevelFilter] = React.useState<string>("all");
  const [campusFilter, setCampusFilter] = React.useState<string>("all");
  const [feePaymentCategoryFilter, setFeePaymentCategoryFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  const loadStudents = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getStudentsListAction();
      if (res.success && res.students) {
        setStudents(res.students);
      }
    } catch (err) {
      console.error("[STUDENT_DIRECTORY] Failed loading students:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Realtime Live Sync: Refresh server component data when students, passports, or visas change
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

  // Dynamically derive available campuses and counts from student records
  const availableCampuses = React.useMemo(() => {
    const campusCounts = new Map<string, number>();
    let notSpecifiedCount = 0;
    students.forEach((s) => {
      const c = s.nfsuCampus?.trim();
      if (c) {
        campusCounts.set(c, (campusCounts.get(c) || 0) + 1);
      } else {
        notSpecifiedCount++;
      }
    });
    const sortedCampuses = Array.from(campusCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
    return { list: sortedCampuses, notSpecifiedCount };
  }, [students]);

  // Determine whether any filtering is currently active
  const isFilterActive = Boolean(
    (searchQuery && searchQuery.trim() !== "") ||
    complianceFilter !== "all" ||
    academicFilter !== "all" ||
    academicLevelFilter !== "all" ||
    campusFilter !== "all" ||
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
          school: student.school,
          admissionCategory: student.admissionCategory,
          iccrApplicationNumber: student.iccrApplicationNumber,
          siiApplicationNumber: student.siiApplicationNumber,
          nfsuCampus: student.nfsuCampus,
          feePaymentCategory: student.feePaymentCategory,
          passportNumber: student.passport?.number,
          visaNumber: student.visa?.number,
          email: student.email,
          complianceStatus: student.complianceStatus,
          academicStatus: student.academicStatus
        },
        filterCriteria
      )
    );
  }, [students, searchQuery, complianceFilter, academicFilter, academicLevelFilter, campusFilter, feePaymentCategoryFilter]);

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

  const getComplianceBadge = (status: Student["complianceStatus"]) => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium text-[11px] px-2 py-0.5 whitespace-nowrap">Compliant</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium text-[11px] px-2 py-0.5 whitespace-nowrap">Warning</Badge>;
      case "non_compliant":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium text-[11px] px-2 py-0.5 whitespace-nowrap">Non-Compliant</Badge>;
      case "expired":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-medium text-[11px] px-2 py-0.5 whitespace-nowrap">Expired</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] px-2 py-0.5 whitespace-nowrap">Unknown</Badge>;
    }
  };

  const getAcademicStatusBadge = (status: Student["academicStatus"]) => {
    switch (status) {
      case "good_standing":
        return <Badge variant="outline" className="border-slate-200 text-slate-700 dark:border-zinc-800 dark:text-zinc-300 font-normal text-[11px] px-2 py-0.5 whitespace-nowrap">Good Standing</Badge>;
      case "probation":
        return <Badge variant="secondary" className="bg-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/10 font-normal text-[11px] px-2 py-0.5 whitespace-nowrap">Academic Probation</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/10 font-normal text-[11px] px-2 py-0.5 whitespace-nowrap">Suspended</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] px-2 py-0.5 whitespace-nowrap">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full min-w-0">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="space-y-1 min-w-0">
          <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">International Student Directory</h1>
          <p className="font-caption text-muted-foreground text-sm">
            Search, filter, and audit academic standings and immigration compliance of registered international students.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Export Excel Action */}
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

          <Link href="/students/import" passHref>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border hover:bg-muted/50 text-xs font-medium">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Bulk Import
            </Button>
          </Link>
          <Link href="/students/add" passHref>
            <Button size="sm" className="h-9 shrink-0 text-xs font-medium shadow-xs">
              <UserPlus className="mr-1.5 h-4 w-4" /> Register Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search Controls Card */}
      <Card className="border border-border/60 shadow-sm bg-card/60 rounded-xl">
        <CardContent className="p-4 flex flex-col gap-3.5">
          {/* Row 1: Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, registration ID, NFSU campus, nationality, or application numbers..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
            {/* Compliance Filter */}
            <div className="min-w-0">
              <Select 
                value={complianceFilter} 
                onValueChange={(val) => {
                  setComplianceFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background">
                  <SelectValue placeholder="Compliance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance Statuses</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="warning">Warning State</SelectItem>
                  <SelectItem value="critical">Critical / Expired</SelectItem>
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
                <SelectTrigger className="h-9 text-xs w-full bg-background">
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

            {/* Academic Status Filter */}
            <div className="min-w-0">
              <Select 
                value={academicFilter} 
                onValueChange={(val) => {
                  setAcademicFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background">
                  <SelectValue placeholder="Academic Standing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Standings</SelectItem>
                  <SelectItem value="good_standing">Good Standing</SelectItem>
                  <SelectItem value="probation">Academic Probation</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* NFSU Campus Filter */}
            <div className="min-w-0">
              <Select 
                value={campusFilter} 
                onValueChange={(val) => {
                  setCampusFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background">
                  <SelectValue placeholder="NFSU Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All NFSU Campuses ({students.length})</SelectItem>
                  {availableCampuses.list.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </SelectItem>
                  ))}
                  {availableCampuses.notSpecifiedCount > 0 && (
                    <SelectItem value="not_specified">
                      Not Specified ({availableCampuses.notSpecifiedCount})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Funding Type Filter */}
            <div className="min-w-0">
              <Select 
                value={feePaymentCategoryFilter} 
                onValueChange={(val) => {
                  setFeePaymentCategoryFilter(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full bg-background">
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
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting || filteredStudents.length === 0}
                onClick={() => handleExport(isFilterActive ? "filtered" : "all")}
                className="h-8 text-xs gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
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

      {/* Main Student Directory Responsive Container */}
      <Card className="border border-border/60 shadow-sm overflow-hidden rounded-xl bg-card">
        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="font-medium text-sm text-foreground">Loading international student records...</p>
              <p className="text-xs text-muted-foreground">Synchronizing student compliance status and academic details</p>
            </div>
          </div>
        ) : paginatedStudents.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center px-4">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2.5 max-w-sm mx-auto">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="font-semibold text-base text-foreground">No student records found</h3>
              <p className="text-xs text-muted-foreground">
                No international students match your current search and filter parameters.
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs h-8">
                Clear all filters
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Desktop / Laptop Fluid Grid View (>= 1024px) */}
            <div className="hidden lg:block">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border/50">
                <div className="col-span-4">Student Identity</div>
                <div className="col-span-2">Nationality</div>
                <div className="col-span-3">Academic Program & Campus</div>
                <div className="col-span-2">Status & Compliance</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Student Rows */}
              <div className="divide-y divide-border/40">
                {paginatedStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-muted/25 transition-colors group"
                  >
                    {/* Student Identity */}
                    <div className="col-span-4 min-w-0 pr-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs font-display border border-primary/20">
                          {student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <Link 
                            href={`/students/${student.id}`} 
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate group-hover:text-primary"
                            title={student.fullName}
                          >
                            {student.fullName}
                          </Link>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "No ID"}
                            </span>
                            {student.admissionCategory && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal border-border/80">
                                {student.admissionCategory}
                              </Badge>
                            )}
                            {student.iccrApplicationNumber && (
                              <span className="text-[10px] text-muted-foreground/80 bg-muted/60 px-1 rounded">
                                ICCR: {student.iccrApplicationNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nationality */}
                    <div className="col-span-2 min-w-0 pr-2">
                      <div className="flex items-center gap-2 font-medium text-xs text-foreground min-w-0">
                        {student.nationalityCode ? (
                          <CountryFlag countryCode={student.nationalityCode} size="md" />
                        ) : (
                          <div className="w-5 h-3.5 rounded bg-muted/60 border border-border/40 inline-block shrink-0" />
                        )}
                        <span className="truncate" title={student.nationalityName || "Not specified"}>
                          {student.nationalityName || "Not specified"}
                        </span>
                      </div>
                    </div>

                    {/* Academic Program & Campus */}
                    <div className="col-span-3 min-w-0 pr-2 space-y-1">
                      <div 
                        className="text-xs font-medium text-foreground leading-snug line-clamp-2 break-words" 
                        title={student.programName}
                      >
                        {student.programName}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {student.school && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={student.school}>
                            {student.school}
                          </span>
                        )}
                        {student.academicLevelLabel && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                            {student.academicLevelLabel}
                          </Badge>
                        )}
                        {student.nfsuCampus && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium shrink-0">
                            {student.nfsuCampus}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status & Compliance */}
                    <div className="col-span-2 min-w-0 flex flex-col gap-1 items-start justify-center pr-2">
                      {getAcademicStatusBadge(student.academicStatus)}
                      {getComplianceBadge(student.complianceStatus)}
                    </div>

                    {/* Actions Menu */}
                    <div className="col-span-1 text-right flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel className="text-xs font-semibold">Student Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            render={
                              <Link href={`/students/${student.id}`} />
                            }
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile & Tablet Structured Responsive Cards (< 1024px) */}
            <div className="block lg:hidden divide-y divide-border/40">
              {paginatedStudents.map((student) => (
                <div key={student.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                  {/* Top Bar: Identity & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs font-display border border-primary/20">
                        {student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link 
                          href={`/students/${student.id}`} 
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors block break-words"
                        >
                          {student.fullName}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono">
                            {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "No ID"}
                          </span>
                          {student.admissionCategory && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                              {student.admissionCategory}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem
                          className="text-xs cursor-pointer"
                          render={
                            <Link href={`/students/${student.id}`} />
                          }
                        >
                          <Eye className="mr-2 h-3.5 w-3.5 text-primary" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Middle Info: Nationality & Academic Program */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      {student.nationalityCode ? (
                        <CountryFlag countryCode={student.nationalityCode} size="sm" />
                      ) : (
                        <div className="w-4 h-3 rounded bg-muted/60 border border-border/40 inline-block" />
                      )}
                      <span>{student.nationalityName || "Not specified"}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-foreground leading-snug break-words">
                        {student.programName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {student.school}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {student.academicLevelLabel && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                          {student.academicLevelLabel}
                        </Badge>
                      )}
                      {student.nfsuCampus && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">
                          {student.nfsuCampus}
                        </Badge>
                      )}
                      {student.feePaymentCategory && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border/60">
                          {student.feePaymentCategory === "scholarship" ? "Scholarship" : "Self-Financed"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Statuses & View Action */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getAcademicStatusBadge(student.academicStatus)}
                      {getComplianceBadge(student.complianceStatus)}
                    </div>

                    <Link href={`/students/${student.id}`} passHref>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 px-2 font-medium">
                        <span>Profile</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40 px-4 py-3 bg-muted/20">
            <div className="text-xs text-muted-foreground font-caption order-2 sm:order-1 text-center sm:text-left">
              Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
              <span className="font-medium text-foreground">{totalItems}</span> students
            </div>
            
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs px-2.5"
              >
                Previous
              </Button>
              <div className="text-xs font-semibold text-muted-foreground px-2 font-caption whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

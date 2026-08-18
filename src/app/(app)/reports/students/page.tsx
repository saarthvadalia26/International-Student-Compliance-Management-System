"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchStudentReport, exportReport } from "../actions";
import { StudentReportRow, ReportFilters } from "@/domain/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Loader2, Download, Printer, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { NationalitySelector } from "@/components/ui/nationality-selector";

export default function StudentReportPage() {
  const [data, setData] = useState<StudentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Page parameters state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Filters state
  const [nationality, setNationality] = useState("");
  const [school, setSchool] = useState("");
  const [complianceStatus, setComplianceStatus] = useState("");

  // Export action state variables
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportCsvSuccess, setExportCsvSuccess] = useState(false);
  const [exportCsvError, setExportCsvError] = useState(false);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportExcelSuccess, setExportExcelSuccess] = useState(false);
  const [exportExcelError, setExportExcelError] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Load report data dynamically
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        country: nationality || undefined,
        school: school || undefined,
        complianceStatus: complianceStatus || undefined
      };
      
      const res = await fetchStudentReport(filters, { page, limit }, sortBy, sortOrder);
      setData(res.data);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, nationality, school, complianceStatus, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) {
        loadData();
      }
    });
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const handleSort = (field: string) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    const isCsv = format === "csv";
    if (isCsv) {
      setIsExportingCsv(true);
      setExportCsvSuccess(false);
      setExportCsvError(false);
    } else {
      setIsExportingExcel(true);
      setExportExcelSuccess(false);
      setExportExcelError(false);
    }

    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        country: nationality || undefined,
        school: school || undefined,
        complianceStatus: complianceStatus || undefined
      };
      const res = await exportReport("student", filters, format);
      
      const blob = new Blob([res.data], { type: res.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      if (isCsv) {
        setExportCsvSuccess(true);
      } else {
        setExportExcelSuccess(true);
      }
      toast.success("Profile updated successfully.");
    } catch (e) {
      console.error(e);
      if (isCsv) {
        setExportCsvError(true);
      } else {
        setExportExcelError(true);
      }
      toast.error("Unable to save changes. Please try again.");
    } finally {
      if (isCsv) {
        setIsExportingCsv(false);
      } else {
        setIsExportingExcel(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in print:p-0 print:bg-white">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Student Registry Report</h1>
          <p className="font-caption text-xs text-muted-foreground mt-1">
            Browse international student records, verify active courses, and run compliance state reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AsyncActionButton
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            isLoading={isExportingCsv}
            isSuccess={exportCsvSuccess}
            isError={exportCsvError}
            idleText={<><Download className="h-4 w-4 mr-1.5 inline" /> CSV</>}
            loadingText="Processing..."
            successText="Changes saved"
            errorText="Try Again"
            className="text-xs h-8"
          />
          <AsyncActionButton
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            isLoading={isExportingExcel}
            isSuccess={exportExcelSuccess}
            isError={exportExcelError}
            idleText={<><Download className="h-4 w-4 mr-1.5 inline" /> Excel</>}
            loadingText="Processing..."
            successText="Changes saved"
            errorText="Try Again"
            className="text-xs h-8"
          />
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="p-4 border border-border/50 bg-card space-y-4 print:hidden">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, registration, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Nationality Filter */}
          <div className="w-full">
            <NationalitySelector
              value={nationality}
              onChange={(v) => { setNationality(v); setPage(1); }}
              placeholder="All Nationalities"
              allowClear={true}
            />
          </div>

          {/* School Filter */}
          <select
            value={school}
            onChange={(e) => { setSchool(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Schools</option>
            <option value="SFS">School of Forensic Sciences</option>
            <option value="SCS">School of Cyber Security</option>
            <option value="SLJ">School of Law & Justice</option>
          </select>

          {/* Compliance Status */}
          <select
            value={complianceStatus}
            onChange={(e) => { setComplianceStatus(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Compliance Statuses</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="WARNING">Warning</option>
            <option value="EXPIRED">Expired</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
          </select>
        </div>
      </Card>

      {/* Tabular Output */}
      <Card className="border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("registration_number")} className="flex items-center gap-1 hover:text-foreground">
                    Reg Number <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("full_name")} className="flex items-center gap-1 hover:text-foreground">
                    Full Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">Nationality</th>
                <th className="p-3 font-semibold text-muted-foreground">School</th>
                <th className="p-3 font-semibold text-muted-foreground">Programme</th>
                <th className="p-3 font-semibold text-muted-foreground">Academic Level</th>
                <th className="p-3 font-semibold text-muted-foreground">Graduation Date</th>
                <th className="p-3 font-semibold text-muted-foreground">Status</th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("compliance_status")} className="flex items-center gap-1 hover:text-foreground">
                    Compliance <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading registry records...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No registry rows matched filters.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.studentId} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium text-foreground">{row.registrationNumber}</td>
                    <td className="p-3 text-foreground font-semibold">{row.fullName}</td>
                    <td className="p-3 text-muted-foreground">{row.nationality}</td>
                    <td className="p-3 text-muted-foreground">{row.school}</td>
                    <td className="p-3 text-muted-foreground">{row.programme}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.academicLevelLabel || (row.academicLevel ? row.academicLevel : "Not Specified")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.expectedGraduation ? row.expectedGraduation.toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.complianceStatus === "COMPLIANT" 
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : row.complianceStatus === "WARNING"
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          : row.complianceStatus === "PENDING_VERIFICATION"
                          ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                      }`}>
                        {row.complianceStatus.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between gap-4 print:hidden">
          <span className="text-xs text-muted-foreground">
            Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} rows)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

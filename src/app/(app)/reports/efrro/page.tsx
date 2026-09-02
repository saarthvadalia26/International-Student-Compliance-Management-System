"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEfrroReport, exportReport, unmaskIdentifier } from "../actions";
import { EfrroReportRow, ReportFilters } from "@/domain/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Printer, Search, ArrowUpDown, ChevronLeft, ChevronRight, Eye, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { ExporterService } from "@/domain/reports/services/exporters";
import { formatDate, formatDateTime } from "@/lib/utils/date";

export default function EfrroReportPage() {
  const [data, setData] = useState<EfrroReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Page parameters state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Filters state
  const [efrroStatus, setEfrroStatus] = useState("");
  const [expiringDays, setExpiringDays] = useState<number | undefined>(undefined);
  
  // Sorting state
  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Security unmasked storage
  const [unmaskedRows, setUnmaskedRows] = useState<Record<string, string>>({});
  const [unmaskingId, setUnmaskingId] = useState<string | null>(null);

  // Load report data dynamically
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        efrroStatus: efrroStatus || undefined,
        expiringWithinDays: expiringDays || undefined
      };
      
      const res = await fetchEfrroReport(filters, { page, limit }, sortBy, sortOrder);
      setData(res.data);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, efrroStatus, expiringDays, page, limit, sortBy, sortOrder]);

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

  const handleUnmask = async (studentId: string) => {
    setUnmaskingId(studentId);
    try {
      const originalVal = await unmaskIdentifier(studentId, "efrro");
      setUnmaskedRows(prev => ({
        ...prev,
        [studentId]: originalVal
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setUnmaskingId(null);
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        efrroStatus: efrroStatus || undefined,
        expiringWithinDays: expiringDays || undefined
      };
      const res = await exportReport("efrro", filters, format);
      
      const blob = new Blob([res.data], { type: res.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e) {
      console.error(e);
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
          <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">eFRRO Expiry & Compliance Report</h1>
          <p className="font-caption text-xs text-muted-foreground mt-1">
            Track student eFRRO verification flows, expirations thresholds, alerts delivery state, and audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5 text-xs">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1.5 text-xs">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="p-4 border border-border/50 bg-card space-y-4 print:hidden">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search eFRRO number, student..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-xs"
            />
          </div>

          {/* eFRRO Status */}
          <select
            value={efrroStatus}
            onChange={(e) => { setEfrroStatus(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Verification Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Verification</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>

          {/* Expiration Interval filter */}
          <select
            value={expiringDays || ""}
            onChange={(e) => { setExpiringDays(e.target.value ? parseInt(e.target.value, 10) : undefined); setPage(1); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any Expiry Window</option>
            <option value="0">Expiring Today</option>
            <option value="7">Expiring within 7 Days</option>
            <option value="15">Expiring within 15 Days</option>
            <option value="30">Expiring within 30 Days</option>
          </select>
        </div>
      </Card>

      {/* Tabular Output */}
      <Card className="border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-3 font-semibold text-muted-foreground">Reg Number</th>
                <th className="p-3 font-semibold text-muted-foreground">Student Name</th>
                <th className="p-3 font-semibold text-muted-foreground">eFRRO Document Number</th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("expiry_date")} className="flex items-center gap-1 hover:text-foreground">
                    Expiry Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("days_remaining")} className="flex items-center gap-1 hover:text-foreground">
                    Days Remaining <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">Reminder Sent</th>
                <th className="p-3 font-semibold text-muted-foreground">Last Alert Sent</th>
                <th className="p-3 font-semibold text-muted-foreground">Verification</th>
                <th className="p-3 font-semibold text-muted-foreground">Audited By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading eFRRO tracking data...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No eFRRO records matched filters.
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const isUnmasked = !!unmaskedRows[row.studentId];
                  const displayedNum = isUnmasked 
                    ? unmaskedRows[row.studentId]
                    : ExporterService.maskIdentifier(row.efrroNumber);

                  return (
                    <tr key={row.studentId} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium text-foreground">{row.registrationNumber}</td>
                      <td className="p-3 text-foreground font-semibold">{row.fullName}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{displayedNum}</span>
                          {!isUnmasked && row.efrroNumber && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={unmaskingId === row.studentId}
                              onClick={() => handleUnmask(row.studentId)}
                              className="h-6 w-12 text-[10px] gap-1 px-1 bg-muted/40 hover:bg-muted flex items-center print:hidden"
                              title="Audit unmask action"
                            >
                              {unmaskingId === row.studentId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" /> Show
                                </>
                              )}
                            </Button>
                          )}
                          {isUnmasked && (
                            <span title="Audited PII access">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.expiryDate ? formatDate(row.expiryDate) : "N/A"}
                      </td>
                      <td className="p-3">
                        {row.daysRemaining !== null ? (
                          <span className={`font-semibold ${
                            row.daysRemaining <= 15 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                          }`}>
                            {row.daysRemaining} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          row.reminderSent
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                        }`}>
                          {row.reminderSent ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.lastReminderSentAt ? formatDateTime(row.lastReminderSentAt) : "N/A"}
                      </td>
                      <td className="p-3">
                        <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.verificationStatus === "verified"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : row.verificationStatus === "pending"
                            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                            : row.verificationStatus === "rejected"
                            ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                        }`}>
                          {row.verificationStatus || "missing"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.reviewerName || "N/A"}</td>
                    </tr>
                  );
                })
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

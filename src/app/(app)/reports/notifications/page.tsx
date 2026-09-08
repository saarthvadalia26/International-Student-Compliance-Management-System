"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchNotificationReport, exportReport } from "../actions";
import { NotificationReportRow, ReportFilters } from "@/domain/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Printer, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, formatDateTime } from "@/lib/utils/date";

export default function NotificationReportPage() {
  const [data, setData] = useState<NotificationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Page parameters state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Filters state
  const [status, setStatus] = useState("");
  
  // Sorting state
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load report data dynamically
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        complianceStatus: status || undefined // maps status filter parameter
      };
      
      const res = await fetchNotificationReport(filters, { page, limit }, sortBy, sortOrder);
      setData(res.data);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page, limit, sortBy, sortOrder]);

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
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined,
        complianceStatus: status || undefined
      };
      const res = await exportReport("notification", filters, format);
      
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

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in print:p-0 print:bg-white">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Notification Delivery Logs</h1>
          <p className="font-caption text-xs text-muted-foreground mt-1">
            Audit automatic eFRRO alert reminder dispatches, delivery statuses, retry cycles, and uploads tracking.
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search registration number, recipient email/phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Delivery Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Delivery Statuses</option>
            <option value="sent">Sent (Success)</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Tabular Output */}
      <Card className="border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-3 font-semibold text-muted-foreground">Registration</th>
                <th className="p-3 font-semibold text-muted-foreground">Student Name</th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("created_at")} className="flex items-center gap-1 hover:text-foreground">
                    Reminder Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">Rule Days</th>
                <th className="p-3 font-semibold text-muted-foreground">Channel</th>
                <th className="p-3 font-semibold text-muted-foreground">Status</th>
                <th className="p-3 font-semibold text-muted-foreground">Retries</th>
                <th className="p-3 font-semibold text-muted-foreground">Last Attempt</th>
                <th className="p-3 font-semibold text-muted-foreground">Next Retry</th>
                <th className="p-3 font-semibold text-muted-foreground">Verification</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading notification logs...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No notification logs matched filters.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.notificationId} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium text-foreground">{row.registrationNumber}</td>
                    <td className="p-3 text-foreground font-semibold">{row.studentName}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(row.reminderDate)}</td>
                    <td className="p-3 text-foreground font-medium">{row.reminderRuleDays} Days</td>
                    <td className="p-3 text-muted-foreground uppercase">{row.channel}</td>
                    <td className="p-3">
                      <span className={`capitalize px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.status === "sent" 
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : row.status === "failed"
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                          : row.status === "queued"
                          ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                          : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.retryCount}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.lastAttemptAt ? formatDateTime(row.lastAttemptAt) : "N/A"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.nextRetryAt ? formatDateTime(row.nextRetryAt) : "N/A"}
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                        {row.verificationStatus || "N/A"}
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

const handlePrint = () => {
  window.print();
};

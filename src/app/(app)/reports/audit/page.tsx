"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAuditReport, exportReport } from "../actions";
import { AuditReportRow, ReportFilters } from "@/domain/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Printer, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";

export default function AuditReportPage() {
  const [data, setData] = useState<AuditReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Page parameters state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  // Sorting state
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load report data dynamically
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ReportFilters = {
        search: debouncedSearch || undefined
      };
      
      const res = await fetchAuditReport(filters, { page, limit }, sortBy, sortOrder);
      setData(res.data);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, sortBy, sortOrder]);

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
        search: debouncedSearch || undefined
      };
      const res = await exportReport("audit", filters, format);
      
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
          <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Security & Export Audit Trail</h1>
          <p className="font-caption text-xs text-muted-foreground mt-1">
            Trace administrative compliance operations, document number unmasking requests, and data exports actions.
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
        <div className="grid gap-4 grid-cols-1">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, administrator email, or target resource..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Tabular Output */}
      <Card className="border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="p-3 font-semibold text-muted-foreground">Administrator</th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("action")} className="flex items-center gap-1 hover:text-foreground">
                    Action <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">
                  <button onClick={() => handleSort("timestamp")} className="flex items-center gap-1 hover:text-foreground">
                    Timestamp <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="p-3 font-semibold text-muted-foreground">Resource</th>
                <th className="p-3 font-semibold text-muted-foreground">Export Type</th>
                <th className="p-3 font-semibold text-muted-foreground">Filters Applied</th>
                <th className="p-3 font-semibold text-muted-foreground">IP Address</th>
                <th className="p-3 font-semibold text-muted-foreground">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading audit database logs...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No administrative audit logs recorded.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium text-foreground">{row.actorEmail || "System/Cron"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.action.includes("UNMASK") 
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-mono"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono"
                      }`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.timestamp.toLocaleString()}</td>
                    <td className="p-3 text-foreground font-mono">{row.resource}</td>
                    <td className="p-3 uppercase text-muted-foreground font-medium">{row.exportType || "N/A"}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={JSON.stringify(row.filtersApplied)}>
                      {JSON.stringify(row.filtersApplied)}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono">{row.ipAddress || "127.0.0.1"}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={row.userAgent || ""}>
                      {row.userAgent || "N/A"}
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

"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  FileSpreadsheet,
  Image as ImageIcon,
  BarChart3,
  Table as TableIcon,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DimensionRow,
  DocumentStatusMetricRow,
  RenewalMetricRow,
  ExportableDimensionType,
  DimensionReportFilters,
} from "@/domain/reports/types/dimensional-reports";
import { exportChartAsImage } from "../utils/chart-export";
import { toast } from "sonner";

interface DimensionCardProps {
  dimension: ExportableDimensionType;
  title: string;
  description: string;
  data: DimensionRow[] | DocumentStatusMetricRow[] | RenewalMetricRow[];
  totalStudents: number;
  filters?: DimensionReportFilters;
  onExportExcel: (dimension: ExportableDimensionType) => Promise<void>;
  isExcelExporting?: boolean;
}

const BAR_COLORS = [
  "#2563eb", // Royal blue
  "#0891b2", // Cyan
  "#059669", // Emerald
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#4f46e5", // Indigo
  "#0d9488", // Teal
  "#e11d48", // Rose
  "#64748b", // Slate
];

export function DimensionCard({
  dimension,
  title,
  description,
  data,
  totalStudents,
  filters = {},
  onExportExcel,
  isExcelExporting = false,
}: DimensionCardProps) {
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");
  const [isChartExporting, setIsChartExporting] = React.useState(false);

  const containerId = `chart-container-${dimension}`;

  // Handle Chart Image PNG export
  const handleExportChart = async () => {
    if (viewMode !== "chart") {
      setViewMode("chart");
      // Allow DOM render
      await new Promise((r) => setTimeout(r, 150));
    }
    setIsChartExporting(true);
    try {
      const fileName = `iscms-${dimension}-chart-${new Date().toISOString().slice(0, 10)}.png`;
      const success = await exportChartAsImage(containerId, fileName, title);
      if (success) {
        toast.success(`Chart exported successfully (${fileName})`);
      } else {
        toast.error("Failed to generate chart image. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Export failed.");
    } finally {
      setIsChartExporting(false);
    }
  };

  const isDocStatus = dimension === "documentStatus";
  const isRenewals = dimension === "renewals";
  const isStandardDimension = !isDocStatus && !isRenewals;

  // Casts
  const standardRows = isStandardDimension ? (data as DimensionRow[]) : [];
  const docStatusRows = isDocStatus ? (data as DocumentStatusMetricRow[]) : [];
  const renewalRows = isRenewals ? (data as RenewalMetricRow[]) : [];

  // Summary badge text
  const itemCount = isStandardDimension
    ? standardRows.length
    : isDocStatus
    ? docStatusRows.length
    : renewalRows.reduce((acc, r) => acc + r.renewalCount, 0);

  return (
    <Card className="flex flex-col border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-h-[44px] flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground tracking-tight">
                {title}
              </CardTitle>
              <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0.5 shrink-0">
                {isRenewals
                  ? `${itemCount} Renewals`
                  : isDocStatus
                  ? "3 Document Types"
                  : `${itemCount} Categories`}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </CardDescription>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            {/* View Mode Switch */}
            <div className="flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5">
              <Button
                variant={viewMode === "chart" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="h-6 px-2 text-[11px] gap-1 shadow-none"
                title="View graphical chart"
              >
                <BarChart3 className="h-3 w-3" />
                Chart
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-6 px-2 text-[11px] gap-1 shadow-none"
                title="View tabular data"
              >
                <TableIcon className="h-3 w-3" />
                Table
              </Button>
            </div>

            {/* PNG Chart Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportChart}
              disabled={isChartExporting}
              className="h-7 px-2 text-xs gap-1 border-border/60 hover:bg-muted"
              title="Download high-resolution chart PNG"
            >
              {isChartExporting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ImageIcon className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">PNG</span>
            </Button>

            {/* Excel Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportExcel(dimension)}
              disabled={isExcelExporting}
              className="h-7 px-2 text-xs gap-1 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              title="Download dimensional Excel (.xlsx)"
            >
              {isExcelExporting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col justify-between">
        {/* CHART VIEW */}
        {viewMode === "chart" && (
          <div id={containerId} className="w-full min-h-[280px] h-[320px] flex items-center justify-center">
            {isStandardDimension && (
              <>
                {standardRows.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground">
                    No students match current filter criteria.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={standardRows.slice(0, 15)}
                      margin={{ top: 12, right: 16, left: -12, bottom: standardRows.length > 6 ? 48 : 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={standardRows.length > 6 ? -30 : 0}
                        textAnchor={standardRows.length > 6 ? "end" : "middle"}
                        height={standardRows.length > 6 ? 56 : 24}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload as DimensionRow;
                            return (
                              <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                                <p className="font-semibold text-foreground">{p.label}</p>
                                {p.subLabel && (
                                  <p className="text-muted-foreground text-[11px]">{p.subLabel}</p>
                                )}
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                                  <span className="text-muted-foreground">Students:</span>
                                  <span className="font-mono font-bold text-foreground">
                                    {p.studentCount}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Share:</span>
                                  <span className="font-mono font-bold text-primary">
                                    {p.percentage.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                        {standardRows.slice(0, 15).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={BAR_COLORS[index % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}

            {/* DOCUMENT STATUS CHART */}
            {isDocStatus && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={docStatusRows}
                  margin={{ top: 12, right: 16, left: -12, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="documentType" tick={{ fontSize: 12, fontWeight: 500 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1.5">
                            <p className="font-semibold text-foreground">{label} Status Breakdown</p>
                            {payload.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-4 text-[11px]"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-muted-foreground">{item.name}:</span>
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="validCount" name="Valid (31+d)" fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expiringCount" name="Upcoming (16–30d)" fill="#d97706" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="criticalCount" name="Critical (0–15d)" fill="#ea580c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expiredCount" name="Expired" fill="#dc2626" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="missingCount" name="Missing / Action" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* RENEWALS CHART */}
            {isRenewals && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={renewalRows}
                  margin={{ top: 12, right: 16, left: -12, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="documentType" tick={{ fontSize: 12, fontWeight: 500 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{label} Renewals</p>
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                              <span className="text-muted-foreground">Version &gt; 1 Count:</span>
                              <span className="font-mono font-bold text-foreground">
                                {payload[0].value}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="renewalCount" name="Renewals (v > 1)" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                    {renewalRows.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#2563eb", "#059669", "#7c3aed"][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <div className="w-full max-h-[320px] overflow-y-auto rounded-lg border border-border/50 bg-background/50">
            {isStandardDimension && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Category / Identifier</th>
                    <th className="py-2 px-3 text-right">Students</th>
                    <th className="py-2 px-3 text-right">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {standardRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    standardRows.map((row, idx) => (
                      <tr key={row.key || idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-foreground">{row.label}</div>
                          {row.subLabel && (
                            <div className="text-[11px] text-muted-foreground">{row.subLabel}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                          {row.studentCount}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-muted-foreground">
                              {row.percentage.toFixed(1)}%
                            </span>
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(row.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {isDocStatus && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Document</th>
                    <th className="py-2 px-2 text-right">Total</th>
                    <th className="py-2 px-2 text-right text-emerald-600 dark:text-emerald-400">Valid</th>
                    <th className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">Upcoming</th>
                    <th className="py-2 px-2 text-right text-orange-600 dark:text-orange-400">Critical</th>
                    <th className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">Expired</th>
                    <th className="py-2 px-2 text-right text-muted-foreground">Missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {docStatusRows.map((row) => (
                    <tr key={row.documentType} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {row.documentType}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        {row.totalWithDoc}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {row.validCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-600 dark:text-amber-400">
                        {row.expiringCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-orange-600 dark:text-orange-400">
                        {row.criticalCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {row.expiredCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-muted-foreground">
                        {row.missingCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isRenewals && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Document Type</th>
                    <th className="py-2 px-3 text-right">Renewal Version Count (&gt; 1)</th>
                    <th className="py-2 px-3 text-right">Invariant Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {renewalRows.map((row) => (
                    <tr key={row.documentType} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {row.documentType}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                        {row.renewalCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px] text-muted-foreground">
                        Original (v1) excluded
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer Summary */}
        <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {isStandardDimension && (
              <>
                Total Represented:{" "}
                <strong className="text-foreground font-mono">
                  {standardRows.reduce((a, b) => a + b.studentCount, 0)}
                </strong>{" "}
                of <strong className="text-foreground font-mono">{totalStudents}</strong> students
              </>
            )}
            {isDocStatus && "Evaluated against active document versions in registry"}
            {isRenewals && "Strictly counts historical extensions / renewals"}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
            ISCMS Reporting
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

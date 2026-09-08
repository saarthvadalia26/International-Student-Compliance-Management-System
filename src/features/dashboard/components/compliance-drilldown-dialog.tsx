"use client";

import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Bell, 
  ExternalLink, 
  RefreshCw,
  Loader2,
  Inbox
} from "lucide-react";
import { 
  ComplianceDrilldownCategory, 
  ComplianceDrilldownResponse 
} from "@/domain/reports/types";
import { fetchDashboardDrilldownAction } from "@/app/(app)/dashboard/actions";
import { getDocumentBadgeClass } from "@/features/compliance/constants/document-theme";
import { formatDate } from "@/lib/utils/date";

interface ComplianceDrilldownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: ComplianceDrilldownCategory | null;
}

export function ComplianceDrilldownDialog({
  isOpen,
  onClose,
  category,
}: ComplianceDrilldownDialogProps) {
  const [data, setData] = React.useState<ComplianceDrilldownResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDocType, setSelectedDocType] = React.useState<string>("all");

  const loadData = React.useCallback(async (cat: ComplianceDrilldownCategory) => {
    setIsLoading(true);
    try {
      const res = await fetchDashboardDrilldownAction(cat);
      setData(res);
    } catch (err) {
      console.error("[DRILLDOWN_FETCH_ERROR]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && category) {
      setSearchQuery("");
      setSelectedDocType("all");
      loadData(category);
    } else {
      setData(null);
    }
  }, [isOpen, category, loadData]);

  const items = data?.items;

  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      // Document type filter
      if (selectedDocType !== "all" && item.documentType !== selectedDocType) {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchReg = item.registrationNumber.toLowerCase().includes(q);
      const matchDoc = item.documentNumber?.toLowerCase().includes(q);
      const matchReason = item.failureReason?.toLowerCase().includes(q);
      return matchName || matchReg || matchDoc || matchReason;
    });
  }, [items, selectedDocType, searchQuery]);

  if (!category) return null;

  const getCategoryMeta = () => {
    switch (category) {
      case "expiring_30":
        return {
          title: "Documents Expiring in 30 Days",
          description: "All authoritative Passport, Visa, and eFRRO permits approaching expiration within 30 days.",
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
        };
      case "critical_15":
        return {
          title: "Critical Expiries (Within 15 Days)",
          description: "Urgent permits requiring immediate attention or renewal processing.",
          icon: AlertTriangle,
          color: "text-orange-600 dark:text-orange-400",
          badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
        };
      case "expired":
        return {
          title: "Expired Compliance Documents",
          description: "Documents whose validity date has elapsed without a recorded active renewal.",
          icon: XCircle,
          color: "text-rose-600 dark:text-rose-400",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
        };
      case "renewals":
        return {
          title: "Document Renewals (Last 30 Days)",
          description: "New document versions and renewals successfully recorded by administrative staff.",
          icon: FileCheck,
          color: "text-blue-600 dark:text-blue-400",
          badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
        };
      case "failed_notifications":
        return {
          title: "Failed Notification Dispatches",
          description: "Alerts that encountered delivery errors across WhatsApp or Email channels.",
          icon: Bell,
          color: "text-red-600 dark:text-red-400",
          badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
        };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${meta.badgeBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  {meta.title}
                  {data && (
                    <Badge variant="outline" className={`text-xs font-mono font-medium ${meta.badgeBg}`}>
                      {data.totalCount} {category === "renewals" ? "Renewals" : "Records"}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {meta.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => category && loadData(category)}
              disabled={isLoading}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Controls: Search & Document Type Filter Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student, registration no, or permit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {category !== "failed_notifications" && data?.byDocType && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={selectedDocType === "all" ? "default" : "outline"}
                  onClick={() => setSelectedDocType("all")}
                  className="h-7 text-[11px] px-2.5 rounded-full"
                >
                  All ({data.totalCount})
                </Button>
                <Button
                  size="sm"
                  variant={selectedDocType === "passport" ? "default" : "outline"}
                  onClick={() => setSelectedDocType("passport")}
                  className="h-7 text-[11px] px-2.5 rounded-full"
                >
                  Passport ({data.byDocType.passport})
                </Button>
                <Button
                  size="sm"
                  variant={selectedDocType === "visa" ? "default" : "outline"}
                  onClick={() => setSelectedDocType("visa")}
                  className="h-7 text-[11px] px-2.5 rounded-full"
                >
                  Visa ({data.byDocType.visa})
                </Button>
                <Button
                  size="sm"
                  variant={selectedDocType === "efrro" ? "default" : "outline"}
                  onClick={() => setSelectedDocType("efrro")}
                  className="h-7 text-[11px] px-2.5 rounded-full"
                >
                  eFRRO ({data.byDocType.efrro})
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Aggregating compliance records...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/50 stroke-[1.5]" />
              <span className="text-xs font-medium text-foreground">No matching compliance records</span>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                {searchQuery
                  ? "No results found matching your search filter."
                  : "All students are currently in good standing for this operational category."}
              </p>
            </div>
          ) : (
            <div className="border border-border/60 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    {category !== "failed_notifications" && (
                      <>
                        <th className="py-2.5 px-3">Document Type</th>
                        <th className="py-2.5 px-3">Document No</th>
                        <th className="py-2.5 px-3">
                          {category === "renewals" ? "Effective Dates" : "Expiry Date"}
                        </th>
                        <th className="py-2.5 px-3">Status / Timeline</th>
                      </>
                    )}
                    {category === "failed_notifications" && (
                      <>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3">Failure Reason</th>
                        <th className="py-2.5 px-3">Attempts</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Student info */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">{item.studentName}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {item.registrationNumber}
                        </div>
                      </td>

                      {/* Regular Document Metrics */}
                      {category !== "failed_notifications" && (
                        <>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getDocumentBadgeClass(
                                item.documentType
                              )}`}
                            >
                              {item.documentType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-foreground">
                            {item.documentNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {category === "renewals" ? (
                              <div className="space-y-0.5">
                                <div className="text-[11px] text-foreground">
                                  Exp: {formatDate(item.expiryDate)}
                                </div>
                                {item.issueDate && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Iss: {formatDate(item.issueDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium text-foreground">
                                {formatDate(item.expiryDate)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {category === "expired" ? (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium text-[10px]">
                                {item.daysExpired} days expired
                              </Badge>
                            ) : category === "critical_15" ? (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 font-medium text-[10px]">
                                {item.daysRemaining} days remaining
                              </Badge>
                            ) : category === "expiring_30" ? (
                              <Badge
                                variant="outline"
                                className={`font-medium text-[10px] ${
                                  (item.daysRemaining ?? 30) <= 15
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {item.daysRemaining} days remaining
                              </Badge>
                            ) : category === "renewals" ? (
                              <div className="space-y-0.5">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium text-[10px]">
                                  {item.versionLabel || "Renewal"}
                                </Badge>
                                {item.recordedAt && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatDate(item.recordedAt)}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </>
                      )}

                      {/* Failed Notifications */}
                      {category === "failed_notifications" && (
                        <>
                          <td className="py-2.5 px-3">
                            <span className="capitalize font-medium text-foreground">
                              {item.channel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate" title={item.failureReason || ""}>
                            {item.failureReason || "Delivery error"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {item.retryCount ?? 0} retries
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {formatDate(item.timestamp)}
                          </td>
                        </>
                      )}

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/students/${item.studentId}?tab=compliance`}
                          onClick={onClose}
                        >
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 hover:text-primary">
                            Profile
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

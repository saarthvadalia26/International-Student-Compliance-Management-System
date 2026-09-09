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
  Inbox,
  ShieldCheck,
  Users,
  AlertCircle,
  ArrowUpRight,
  X,
  MessageSquare,
  Mail,
  Loader2
} from "lucide-react";
import { 
  ComplianceDrilldownCategory, 
  ComplianceDrilldownResponse 
} from "@/domain/reports/types";
import { fetchDashboardDrilldownAction } from "@/app/(app)/dashboard/actions";
import { getDocumentBadgeClass } from "@/features/compliance/constants/document-theme";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/country-flag";

interface ComplianceDrilldownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: ComplianceDrilldownCategory | null;
  destinationHref?: string | null;
}

export function ComplianceDrilldownDialog({
  isOpen,
  onClose,
  category,
  destinationHref,
}: ComplianceDrilldownDialogProps) {
  const [data, setData] = React.useState<ComplianceDrilldownResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDocType, setSelectedDocType] = React.useState<string>("all");
  const [selectedChannel, setSelectedChannel] = React.useState<string>("all");
  const [selectedStudentFilter, setSelectedStudentFilter] = React.useState<"all" | "compliant" | "missing">("all");

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
      setSelectedChannel("all");
      setSelectedStudentFilter("all");
      loadData(category);
    } else {
      setData(null);
    }
  }, [isOpen, category, loadData]);

  const items = data?.items;

  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      // Document type filter (for document categories)
      if (selectedDocType !== "all" && item.documentType !== selectedDocType) {
        return false;
      }
      // Channel filter (for notification categories)
      if (selectedChannel !== "all" && item.channel?.toLowerCase() !== selectedChannel) {
        return false;
      }
      // Student status filter (for student list categories)
      if (selectedStudentFilter === "compliant" && item.complianceStatus !== "COMPLIANT") {
        return false;
      }
      if (selectedStudentFilter === "missing" && item.complianceStatus === "COMPLIANT") {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchReg = item.registrationNumber.toLowerCase().includes(q);
      const matchDoc = item.documentNumber?.toLowerCase().includes(q);
      const matchReason = item.failureReason?.toLowerCase().includes(q);
      const matchProg = item.academicProgram?.toLowerCase().includes(q);
      const matchNat =
        (item.nationality && item.nationality.toLowerCase().includes(q)) ||
        (item.nationalityCode && item.nationalityCode.toLowerCase().includes(q)) ||
        (item.nationalityDemonym && item.nationalityDemonym.toLowerCase().includes(q));
      const matchStatus = item.complianceStatus?.toLowerCase().includes(q);
      const matchMissing = item.missingDocuments?.some((d) => d.toLowerCase().includes(q));
      return (
        matchName ||
        matchReg ||
        matchDoc ||
        matchReason ||
        matchProg ||
        matchNat ||
        matchStatus ||
        matchMissing
      );
    });
  }, [items, selectedDocType, selectedChannel, selectedStudentFilter, searchQuery]);

  if (!category) return null;

  const getCategoryMeta = () => {
    switch (category) {
      case "total_students":
        return {
          title: "All Active International Students",
          description: "Authoritative active roster of enrolled international students and compliance status.",
          icon: Users,
          color: "text-zinc-600 dark:text-zinc-300",
          badgeBg: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
          defaultHref: "/students",
          hrefLabel: "Open Student Directory"
        };
      case "compliant":
        return {
          title: "Fully Compliant Students",
          description: "Students meeting 100% compliance criteria with active, verified Passport, Visa, and eFRRO permits.",
          icon: ShieldCheck,
          color: "text-emerald-600 dark:text-emerald-400",
          badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          defaultHref: "/students?compliance=COMPLIANT",
          hrefLabel: "Open Compliant Filter"
        };
      case "expiring_30":
        return {
          title: "Documents Expiring in 30 Days",
          description: "All authoritative Passport, Visa, and eFRRO permits approaching expiration within 30 days.",
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          defaultHref: null,
          hrefLabel: null
        };
      case "critical_15":
        return {
          title: "Critical Expiries (Within 15 Days)",
          description: "Urgent permits requiring immediate administrative attention or renewal processing.",
          icon: AlertTriangle,
          color: "text-orange-600 dark:text-orange-400",
          badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
          defaultHref: null,
          hrefLabel: null
        };
      case "expired":
        return {
          title: "Expired Compliance Documents",
          description: "Documents whose validity date has elapsed without a recorded active renewal.",
          icon: XCircle,
          color: "text-rose-600 dark:text-rose-400",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          defaultHref: null,
          hrefLabel: null
        };
      case "renewals":
        return {
          title: "Document Renewals (Last 30 Days)",
          description: "New document versions and renewals successfully recorded by administrative staff.",
          icon: FileCheck,
          color: "text-blue-600 dark:text-blue-400",
          badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          defaultHref: null,
          hrefLabel: null
        };
      case "notifications_today":
        return {
          title: "Notifications Dispatched Today",
          description: "Automated compliance alerts and reminders dispatched today via WhatsApp and Email.",
          icon: Bell,
          color: "text-indigo-600 dark:text-indigo-400",
          badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          defaultHref: "/reports/notifications",
          hrefLabel: "Open Notification Center"
        };
      case "failed_notifications":
        return {
          title: "Failed Notification Dispatches",
          description: "Alerts that encountered delivery errors across WhatsApp or Email channels.",
          icon: AlertCircle,
          color: "text-red-600 dark:text-red-400",
          badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
          defaultHref: "/reports/notifications",
          hrefLabel: "Open Delivery Logs"
        };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;
  const directLink = destinationHref || meta.defaultHref;

  const isNotificationCategory = category === "failed_notifications" || category === "notifications_today";
  const isStudentListCategory = category === "total_students" || category === "compliant";

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "ST"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-6xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
        {/* Header Banner */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/50 bg-muted/20 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
            {/* Left: Icon & Titles */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={cn("p-2.5 rounded-xl border shrink-0 shadow-xs", meta.badgeBg)}>
                <Icon className={cn("h-6 w-6", meta.color)} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {meta.title}
                  </DialogTitle>
                  {data && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-mono font-medium px-2.5 py-0.5 shadow-2xs", meta.badgeBg)}
                    >
                      {data.totalCount} {category === "renewals" ? "Renewals" : "Records"}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  {meta.description}
                </DialogDescription>
              </div>
            </div>

            {/* Right: Quick Actions (Refresh & Open Full Page) */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              {directLink && (
                <Link href={directLink} onClick={onClose}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-border/70 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <span>{meta.hrefLabel || "Open Full View"}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => category && loadData(category)}
                disabled={isLoading}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={
                  isNotificationCategory
                    ? "Search recipient, ID, channel, error message..."
                    : isStudentListCategory
                    ? "Search student name, registration number, program, nationality..."
                    : "Search student, registration number, or document number..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-background/90 border-border/70 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
              {/* Document Categories Filter Chips */}
              {!isNotificationCategory && !isStudentListCategory && data?.byDocType && (
                <>
                  <Button
                    size="sm"
                    variant={selectedDocType === "all" ? "default" : "outline"}
                    onClick={() => setSelectedDocType("all")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedDocType === "all"
                        ? "shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    All ({data.totalCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDocType === "passport" ? "default" : "outline"}
                    onClick={() => setSelectedDocType("passport")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedDocType === "passport"
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    Passport ({data.byDocType.passport})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDocType === "visa" ? "default" : "outline"}
                    onClick={() => setSelectedDocType("visa")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedDocType === "visa"
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    Visa ({data.byDocType.visa})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDocType === "efrro" ? "default" : "outline"}
                    onClick={() => setSelectedDocType("efrro")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedDocType === "efrro"
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    eFRRO ({data.byDocType.efrro})
                  </Button>
                </>
              )}

              {/* Student List Compliance Filter Chips */}
              {isStudentListCategory && items && (
                <>
                  <Button
                    size="sm"
                    variant={selectedStudentFilter === "all" ? "default" : "outline"}
                    onClick={() => setSelectedStudentFilter("all")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedStudentFilter === "all"
                        ? "shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    All ({items.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedStudentFilter === "compliant" ? "default" : "outline"}
                    onClick={() => setSelectedStudentFilter("compliant")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all gap-1.5",
                      selectedStudentFilter === "compliant"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Compliant ({items.filter((i) => i.complianceStatus === "COMPLIANT").length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedStudentFilter === "missing" ? "default" : "outline"}
                    onClick={() => setSelectedStudentFilter("missing")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all gap-1.5",
                      selectedStudentFilter === "missing"
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        : "border-border/60 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Action Required ({items.filter((i) => i.complianceStatus !== "COMPLIANT").length})
                  </Button>
                </>
              )}

              {/* Notification Channels Filter Chips */}
              {isNotificationCategory && (
                <>
                  <Button
                    size="sm"
                    variant={selectedChannel === "all" ? "default" : "outline"}
                    onClick={() => setSelectedChannel("all")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all",
                      selectedChannel === "all" ? "shadow-xs" : "border-border/60 text-muted-foreground"
                    )}
                  >
                    All Channels ({items?.length || 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedChannel === "whatsapp" ? "default" : "outline"}
                    onClick={() => setSelectedChannel("whatsapp")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all gap-1.5",
                      selectedChannel === "whatsapp"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    WhatsApp ({items?.filter((i) => i.channel?.toLowerCase() === "whatsapp").length || 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedChannel === "email" ? "default" : "outline"}
                    onClick={() => setSelectedChannel("email")}
                    className={cn(
                      "h-8 text-xs px-3 rounded-full transition-all gap-1.5",
                      selectedChannel === "email"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    <Mail className="h-3 w-3" />
                    Email ({items?.filter((i) => i.channel?.toLowerCase() === "email").length || 0})
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Table Container */}
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 bg-background/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-medium text-foreground">Loading compliance records...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 mb-3.5 shadow-2xs">
                {searchQuery ? (
                  <Search className="h-8 w-8 text-muted-foreground/60 stroke-[1.5]" />
                ) : (
                  <Inbox className="h-8 w-8 text-muted-foreground/60 stroke-[1.5]" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery ? "No matching records found" : "No records in this operational category"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                {searchQuery
                  ? `No entries matched your search "${searchQuery}". Check for typos or reset your filters.`
                  : category === "renewals"
                  ? "No new document renewals or superseded versions have been recorded in the past 30 days."
                  : category === "critical_15"
                  ? "Excellent! Zero permits have an expiration date within the next 15 days."
                  : category === "expiring_30"
                  ? "All active student permits have greater than 30 days of validity remaining."
                  : category === "expired"
                  ? "Zero expired documents detected. All enrolled students are legally documented."
                  : category === "failed_notifications"
                  ? "Clean dispatch log! Zero notification delivery failures recorded."
                  : category === "notifications_today"
                  ? "No compliance reminders or alerts have been dispatched today yet."
                  : "All students are in good standing."}
              </p>
              {searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 h-8 text-xs gap-1.5"
                >
                  <X className="h-3 w-3" />
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            /* Authoritative Responsive Data Table */
            <div className="min-w-[840px] w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-md border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4 w-[280px]">Student & ID</th>

                    {/* Regular Document Metrics */}
                    {!isNotificationCategory && !isStudentListCategory && (
                      <>
                        <th className="py-3 px-4 w-[130px]">Document Type</th>
                        <th className="py-3 px-4 w-[150px]">Document No</th>
                        <th className="py-3 px-4 w-[180px]">
                          {category === "renewals" ? "Effective Dates" : "Expiry Date"}
                        </th>
                        <th className="py-3 px-4 w-[180px]">
                          {category === "renewals" ? "Renewal Version" : "Compliance Status"}
                        </th>
                      </>
                    )}

                    {/* Student List Metrics (Total Students / Compliant) */}
                    {isStudentListCategory && (
                      <>
                        <th className="py-3 px-4 w-[140px]">Compliance Status</th>
                        <th className="py-3 px-4 w-[200px]">Program & Nationality</th>
                        <th className="py-3 px-4 w-[240px]">Document Validity Summary</th>
                      </>
                    )}

                    {/* Failed or Today's Notifications */}
                    {isNotificationCategory && (
                      <>
                        <th className="py-3 px-4 w-[120px]">Channel</th>
                        <th className="py-3 px-4 w-[120px]">Document</th>
                        <th className="py-3 px-4">
                          {category === "failed_notifications" ? "Error Reason" : "Delivery Status"}
                        </th>
                        <th className="py-3 px-4 w-[140px]">
                          {category === "failed_notifications" ? "Retry Attempts" : "Dispatched At"}
                        </th>
                      </>
                    )}

                    <th className="py-3 px-4 text-right w-[110px]">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/40 bg-card">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Student Info with Initials Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                            {getInitials(item.studentName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-xs leading-snug group-hover:text-primary transition-colors truncate max-w-[200px]">
                              {item.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {item.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Standard Document Metric Rows */}
                      {!isNotificationCategory && !isStudentListCategory && (
                        <>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border tracking-wider",
                                getDocumentBadgeClass(item.documentType)
                              )}
                            >
                              {item.documentType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-medium text-foreground tracking-wide">
                            {item.documentNumber || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {category === "renewals" ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-medium text-foreground">
                                  Exp: {formatDate(item.expiryDate)}
                                </div>
                                {item.issueDate && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Iss: {formatDate(item.issueDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium text-foreground text-xs">
                                {formatDate(item.expiryDate)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {category === "expired" ? (
                              <Badge
                                variant="outline"
                                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium text-[11px] px-2 py-0.5 gap-1"
                              >
                                <XCircle className="h-3 w-3" />
                                {item.daysExpired} days expired
                              </Badge>
                            ) : category === "critical_15" ? (
                              <Badge
                                variant="outline"
                                className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 font-medium text-[11px] px-2 py-0.5 gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {item.daysRemaining} days left
                              </Badge>
                            ) : category === "expiring_30" ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium text-[11px] px-2 py-0.5 gap-1",
                                  (item.daysRemaining ?? 30) <= 15
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                )}
                              >
                                <Clock className="h-3 w-3" />
                                {item.daysRemaining} days remaining
                              </Badge>
                            ) : category === "renewals" ? (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium text-[11px] px-2 py-0.5 gap-1"
                                >
                                  <FileCheck className="h-3 w-3" />
                                  {item.versionLabel || "Renewal"}
                                </Badge>
                                {item.recordedAt && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    Recorded: {formatDate(item.recordedAt)}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </>
                      )}

                      {/* Student List Rows (Total Students / Compliant) */}
                      {isStudentListCategory && (
                        <>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 uppercase tracking-wide gap-1",
                                item.complianceStatus === "COMPLIANT"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : item.complianceStatus === "INCOMPLETE" || item.complianceStatus === "MISSING"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              )}
                            >
                              {item.complianceStatus === "COMPLIANT" ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {item.complianceStatus === "COMPLIANT"
                                ? "Compliant"
                                : item.missingDocuments && item.missingDocuments.length > 0
                                ? `Missing ${item.missingDocuments.join(", ")}`
                                : item.complianceStatus || "NON_COMPLIANT"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs text-foreground font-medium truncate max-w-[190px]">
                              {item.academicProgram || "Academic Program"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              {item.nationalityCode && (
                                <CountryFlag countryCode={item.nationalityCode} size="sm" />
                              )}
                              <span className="truncate">{item.nationality || "International"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-[11px] font-mono">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded border text-[10px]",
                                  item.passportExpiry
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                                title={`Passport: ${formatDate(item.passportExpiry)}`}
                              >
                                P: {item.passportExpiry ? formatDate(item.passportExpiry) : "—"}
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded border text-[10px]",
                                  item.visaExpiry
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                                title={`Visa: ${formatDate(item.visaExpiry)}`}
                              >
                                V: {item.visaExpiry ? formatDate(item.visaExpiry) : "—"}
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded border text-[10px]",
                                  item.efrroExpiry
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                                title={`eFRRO: ${formatDate(item.efrroExpiry)}`}
                              >
                                eF: {item.efrroExpiry ? formatDate(item.efrroExpiry) : "—"}
                              </span>
                            </div>
                          </td>
                        </>
                      )}

                      {/* Notification Rows */}
                      {isNotificationCategory && (
                        <>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize text-[11px] font-medium gap-1 px-2 py-0.5",
                                item.channel?.toLowerCase() === "whatsapp"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                              )}
                            >
                              {item.channel?.toLowerCase() === "whatsapp" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {item.channel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border",
                                getDocumentBadgeClass(item.documentType)
                              )}
                            >
                              {item.documentType || "Alert"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {category === "failed_notifications" ? (
                              <span
                                className="text-rose-600 dark:text-rose-400 font-medium truncate block max-w-sm"
                                title={item.failureReason || ""}
                              >
                                {item.failureReason || "Delivery failure"}
                              </span>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                              >
                                {item.status || "Dispatched"}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                            {category === "failed_notifications" ? (
                              <span className="text-foreground font-semibold">
                                {item.retryCount ?? 0} retries
                              </span>
                            ) : (
                              <span>{formatDate(item.timestamp)}</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/students/${item.studentId}?tab=compliance`}
                          onClick={onClose}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground border-border/70 group-hover:border-primary/50 transition-all"
                          >
                            <span>Profile</span>
                            <ArrowUpRight className="h-3 w-3" />
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

        {/* Footer Summary */}
        <div className="px-5 sm:px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-foreground">{filteredItems.length}</strong> of{" "}
              <strong className="text-foreground">{data?.totalCount || 0}</strong> records
            </span>
            {searchQuery && (
              <span className="text-[11px] text-muted-foreground">
                (filtered by &ldquo;{searchQuery}&rdquo;)
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

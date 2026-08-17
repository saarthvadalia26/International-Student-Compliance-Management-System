"use client";

import * as React from "react";
import { 
  Bell, 
  RotateCw, 
  Loader2, 
  Calendar, 
  CalendarDays, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info,
  MessageSquare
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ComplianceDocumentType, 
  getDocumentTheme 
} from "../constants/constants";
import { 
  StudentReminderScheduleResponse, 
  DocumentReminderGroup, 
  ReminderScheduleItem 
} from "@/domain/notifications/types/reminder.types";

export interface DocumentReminderScheduleProps {
  schedule?: StudentReminderScheduleResponse | Record<"passport" | "visa" | "efrro", DocumentReminderGroup> | null;
  selectedDocType: ComplianceDocumentType;
  onSelectDocType: (docType: ComplianceDocumentType) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
  onOpenDispatch: (docType: ComplianceDocumentType, thresholdDays: number, ruleId: string, ruleName: string) => void;
  isDispatchingReminderId?: string | null;
  className?: string;
}

export const DOCUMENT_TAB_CONFIG: Array<{
  type: ComplianceDocumentType;
  label: string;
  shortLabel: string;
}> = [
  { type: "passport", label: "Passport", shortLabel: "Passport" },
  { type: "visa", label: "Visa", shortLabel: "Visa" },
  { type: "efrro", label: "eFRRO", shortLabel: "eFRRO" }
];

export function getReminderStatusBadge(status: string, statusLabel?: string): React.JSX.Element {
  const normalizedStatus = (status || "").toUpperCase();

  switch (normalizedStatus) {
    case "DUE":
      if (statusLabel === "Due Today" || statusLabel === "Due Now") {
        return (
          <Badge 
            variant="outline" 
            className="text-[9px] px-1.5 py-0.5 h-5 font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
          >
            {statusLabel}
          </Badge>
        );
      }
      return (
        <Badge 
          variant="outline" 
          className="text-[9px] px-1.5 py-0.5 h-5 font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
        >
          {statusLabel || "Passed"}
        </Badge>
      );
    case "DISPATCHED":
      return (
        <Badge 
          variant="secondary" 
          className="text-[9px] px-1.5 py-0.5 h-5 font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"
        >
          <CheckCircle2 className="h-2.5 w-2.5" /> Dispatched
        </Badge>
      );
    case "FAILED":
      return (
        <Badge 
          variant="destructive" 
          className="text-[9px] px-1.5 py-0.5 h-5 font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1"
        >
          <XCircle className="h-2.5 w-2.5" /> Failed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge 
          variant="outline" 
          className="text-[9px] px-1.5 py-0.5 h-5 text-muted-foreground border-border/60 bg-muted/20"
        >
          Cancelled
        </Badge>
      );
    case "NOT_APPLICABLE":
      return (
        <Badge 
          variant="outline" 
          className="text-[9px] px-1.5 py-0.5 h-5 text-muted-foreground border-border/60"
        >
          Not Available
        </Badge>
      );
    case "NOT_DUE":
    default:
      return (
        <Badge 
          variant="outline" 
          className="text-[9px] px-1.5 py-0.5 h-5 font-normal text-muted-foreground border-border/60 bg-muted/10"
        >
          {statusLabel || "Scheduled"}
        </Badge>
      );
  }
}

export function DocumentReminderSchedule({
  schedule,
  selectedDocType,
  onSelectDocType,
  isLoading = false,
  onRefresh,
  onOpenDispatch,
  isDispatchingReminderId = null,
  className = ""
}: DocumentReminderScheduleProps): React.JSX.Element {
  const activeDocTheme = getDocumentTheme(selectedDocType);
  const currentDoc = schedule?.[selectedDocType];

  const docTitle = 
    selectedDocType === "passport"
      ? "Passport"
      : selectedDocType === "visa"
      ? "Visa"
      : "eFRRO / Residential Permit";

  return (
    <Card className={`border border-border/70 shadow-xs overflow-hidden bg-card w-full max-w-full min-w-0 box-border @container ${className}`}>
      {/* 1. CARD HEADER */}
      <CardHeader className="p-3 sm:p-4 pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between gap-2.5 w-full min-w-0 box-border">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wider truncate">
              Document Reminder Schedule
            </CardTitle>
            <CardDescription className="text-[9px] sm:text-[10px] font-caption text-muted-foreground truncate">
              Automated expiry-driven WhatsApp notification timetable
            </CardDescription>
          </div>
        </div>

        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            disabled={isLoading} 
            className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            title="Refresh reminder schedules"
            aria-label="Refresh reminder schedules"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3.5 text-xs w-full max-w-full min-w-0 box-border overflow-hidden">
        {/* 2. DOCUMENT SELECTOR TABS (Responsive Segmented Control with EXACTLY ONE dot per tab) */}
        <div 
          role="tablist" 
          aria-label="Compliance Document Types" 
          className="grid grid-cols-3 gap-1 p-1 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border/60 text-xs w-full min-w-0 box-border"
        >
          {DOCUMENT_TAB_CONFIG.map(({ type, label }) => {
            const isSelected = selectedDocType === type;
            const tabTheme = getDocumentTheme(type);

            return (
              <button
                key={type}
                role="tab"
                type="button"
                id={`reminder-tab-${type}`}
                aria-selected={isSelected}
                aria-controls={`reminder-panel-${type}`}
                onClick={() => onSelectDocType(type)}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-md text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer min-w-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "bg-background text-foreground font-semibold shadow-xs ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                {/* Single Authoritative Document Type Identity Dot */}
                <span 
                  className={`h-2 w-2 rounded-full shrink-0 ${tabTheme.dotClass}`}
                  aria-hidden="true" 
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. CONTENT AREA */}
        <div 
          id={`reminder-panel-${selectedDocType}`}
          role="tabpanel"
          aria-labelledby={`reminder-tab-${selectedDocType}`}
          className="space-y-3.5 w-full min-w-0 box-border"
        >
          {isLoading && !schedule ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/10 w-full min-w-0">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span>Loading reminder schedule...</span>
            </div>
          ) : !currentDoc?.expiryDate ? (
            /* Empty State: Expiry date not recorded */
            <div className="py-6 sm:py-8 text-center space-y-2 rounded-lg border border-dashed border-border/70 p-4 bg-muted/5 w-full min-w-0 box-border">
              <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/60 mx-auto" />
              <p className="font-semibold text-xs text-foreground">
                {docTitle} expiry date not available
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto font-caption leading-relaxed">
                Add or verify the student&apos;s {docTitle.toLowerCase()} expiry date to generate the automated WhatsApp reminder schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 w-full min-w-0 box-border">
              {/* Active Source Expiry Date Banner */}
              <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full min-w-0 box-border ${activeDocTheme.bannerClass}`}>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold font-caption block truncate ${activeDocTheme.bannerTitleClass}`}>
                    Active {docTitle} Expiry
                  </span>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 font-mono">
                    <Calendar className={`h-3.5 w-3.5 shrink-0 ${activeDocTheme.bannerIconClass}`} />
                    <span className="truncate">{currentDoc.expiryDateFormatted}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {/* Physical Document State Badge */}
                  {!currentDoc.isUploaded || currentDoc.verificationStatus === "not_uploaded" ? (
                    <Badge variant="outline" className="text-[9px] h-5 font-medium text-muted-foreground border-border/60 bg-muted/20 whitespace-nowrap">
                      Document Not Uploaded
                    </Badge>
                  ) : currentDoc.verificationStatus === "pending" ? (
                    <Badge variant="outline" className="text-[9px] h-5 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 whitespace-nowrap">
                      Document Pending Verification
                    </Badge>
                  ) : currentDoc.verificationStatus === "verified" ? (
                    <Badge variant="outline" className="text-[9px] h-5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 whitespace-nowrap">
                      Document Verified
                    </Badge>
                  ) : currentDoc.verificationStatus === "rejected" ? (
                    <Badge variant="destructive" className="text-[9px] h-5 font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 whitespace-nowrap">
                      Document Rejected
                    </Badge>
                  ) : null}

                  {currentDoc.isExpired ? (
                    <Badge variant="destructive" className="text-[10px] h-5 font-semibold whitespace-nowrap">Expired</Badge>
                  ) : (
                    <Badge variant="outline" className={`text-[10px] h-5 font-mono font-medium whitespace-nowrap ${activeDocTheme.badgeClass}`}>
                      {currentDoc.daysRemaining} days left
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="text-[9px] h-5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-medium flex items-center gap-1 whitespace-nowrap">
                    <MessageSquare className="h-2.5 w-2.5" /> WhatsApp
                  </Badge>
                </div>
              </div>

              {/* Expired State Warning Callout */}
              {currentDoc.isExpired && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300 w-full min-w-0 box-border">
                  <div className="flex items-start sm:items-center gap-1.5 min-w-0 flex-1">
                    <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-snug break-words">
                      <strong>{docTitle} expired {Math.abs(currentDoc.daysRemaining || 0)} days ago.</strong> No upcoming pre-expiry reminders remain.
                    </span>
                  </div>
                  <Badge variant="destructive" className="text-[9px] font-semibold shrink-0 self-start sm:self-auto">
                    Expired
                  </Badge>
                </div>
              )}

              {/* Critical Alert Callout for Expiry within 15 Days */}
              {currentDoc.daysRemaining !== null && currentDoc.daysRemaining <= 15 && !currentDoc.isExpired && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200 w-full min-w-0 box-border">
                  <div className="flex items-start sm:items-center gap-1.5 min-w-0 flex-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-snug break-words">
                      <strong>{currentDoc.daysRemaining === 0 ? "Expires Today!" : `Critical Warning: Expires in ${currentDoc.daysRemaining} days!`}</strong> 15-Day reminder is triggered and due for dispatch.
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse shrink-0 self-start sm:self-auto">
                    {currentDoc.daysRemaining === 0 ? "Due Today" : "Due Now"}
                  </Badge>
                </div>
              )}

              {/* Metadata Tracking Notice when physical document copy has not been uploaded */}
              {!currentDoc.isUploaded && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-md bg-muted/30 border border-border/50 text-[11px] text-muted-foreground w-full min-w-0 box-border">
                  <div className="flex items-start sm:items-center gap-1.5 min-w-0 flex-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-relaxed break-words text-[11px]">
                      The system tracks when the {docTitle.toLowerCase()} expires, but the physical document has not yet been uploaded.
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] font-semibold shrink-0 self-start sm:self-auto ${activeDocTheme.badgeClass}`}>
                    Metadata Tracking
                  </Badge>
                </div>
              )}

              {/* 4A. DESKTOP/TABLET TABLE VIEW (Visible when container has sufficient width >= 512px / @lg) */}
              <div className="hidden @lg:block rounded-lg border border-border/60 overflow-hidden bg-card w-full max-w-full min-w-0 box-border">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-[11px] text-left min-w-[440px]">
                    <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase border-b border-border/50">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Reminder</th>
                        <th className="py-2.5 px-2.5 font-semibold">Trigger</th>
                        <th className="py-2.5 px-2.5 font-semibold">Scheduled Date</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Status & Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {currentDoc.schedule.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                            No reminder milestones configured for this document.
                          </td>
                        </tr>
                      ) : (
                        currentDoc.schedule.map((item: ReminderScheduleItem) => {
                          const isDue = item.status === "DUE";
                          const isCurrentDispatching = isDispatchingReminderId === item.ruleId;

                          return (
                            <tr key={item.ruleId} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 min-w-0">
                                <span className="font-semibold text-foreground block leading-tight">
                                  {item.ruleName}
                                </span>
                                <span className="text-[9px] text-muted-foreground font-caption flex items-center gap-1 mt-0.5">
                                  <MessageSquare className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> via WhatsApp
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-muted-foreground whitespace-nowrap">
                                {item.thresholdDays} days before expiry
                              </td>
                              <td className="py-2.5 px-2.5 font-medium text-foreground whitespace-nowrap font-mono">
                                {item.scheduledDate || <span className="text-muted-foreground font-normal font-sans">N/A</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {getReminderStatusBadge(item.status, item.statusLabel)}
                                  {isDue && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onOpenDispatch(selectedDocType, item.thresholdDays, item.ruleId, item.ruleName)}
                                      disabled={isCurrentDispatching}
                                      className={`h-6 px-2 text-[10px] cursor-pointer font-medium ${activeDocTheme.buttonOutlineClass}`}
                                      title="Dispatch WhatsApp notification now"
                                      aria-label={`Dispatch ${item.ruleName} WhatsApp notification`}
                                    >
                                      {isCurrentDispatching ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <Send className="h-2.5 w-2.5" />
                                          <span>Dispatch</span>
                                        </span>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4B. MOBILE/COMPACT CARD PRESENTATION (Active on mobile viewports and narrow sidebar containers < @lg) */}
              <div className="block @lg:hidden space-y-2.5 w-full min-w-0 max-w-full box-border">
                {currentDoc.schedule.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground rounded-lg border border-border/50 bg-muted/10">
                    No reminder milestones configured for this document.
                  </div>
                ) : (
                  currentDoc.schedule.map((item: ReminderScheduleItem) => {
                    const isDue = item.status === "DUE";
                    const isCurrentDispatching = isDispatchingReminderId === item.ruleId;

                    return (
                      <div 
                        key={item.ruleId} 
                        className="p-3 sm:p-3.5 rounded-lg border border-border/60 bg-muted/15 space-y-2.5 w-full min-w-0 max-w-full box-border shadow-2xs"
                      >
                        {/* 1. Reminder Name & Header */}
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-foreground text-xs leading-snug break-words">
                              {item.ruleName}
                            </h4>
                          </div>
                          <div className="shrink-0">
                            {getReminderStatusBadge(item.status, item.statusLabel)}
                          </div>
                        </div>

                        {/* 2 & 3. Trigger & Scheduled Date Grid */}
                        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-border/30">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-caption font-semibold tracking-wider text-muted-foreground block">
                              Trigger
                            </span>
                            <span className="text-xs text-foreground font-medium block break-words">
                              {item.thresholdDays} days before expiry
                            </span>
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-caption font-semibold tracking-wider text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" /> Scheduled
                            </span>
                            <span className="text-xs font-mono font-semibold text-foreground block break-words">
                              {item.scheduledDate || <span className="text-muted-foreground font-normal font-sans">N/A</span>}
                            </span>
                          </div>
                        </div>

                        {/* 4 & 5. Channel & Delivery Details */}
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/30 min-w-0">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] uppercase font-caption font-semibold tracking-wider text-muted-foreground block">
                              Channel
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 truncate">
                              <MessageSquare className="h-3 w-3 shrink-0" /> WhatsApp
                            </span>
                          </div>

                          <div className="space-y-0.5 text-right min-w-0">
                            <span className="text-[10px] uppercase font-caption font-semibold tracking-wider text-muted-foreground block">
                              Status
                            </span>
                            <span className="text-xs text-muted-foreground font-medium block truncate">
                              {item.statusLabel || (isDue ? "Due Now" : "Scheduled")}
                            </span>
                          </div>
                        </div>

                        {/* 6. Action Button (Touch friendly with full width) */}
                        {isDue && (
                          <div className="pt-2 border-t border-border/30">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenDispatch(selectedDocType, item.thresholdDays, item.ruleId, item.ruleName)}
                              disabled={isCurrentDispatching}
                              className={`w-full h-8 text-xs font-semibold cursor-pointer justify-center shadow-2xs ${activeDocTheme.buttonOutlineClass}`}
                              title="Dispatch WhatsApp notification now"
                              aria-label={`Dispatch ${item.ruleName} WhatsApp notification`}
                            >
                              {isCurrentDispatching ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Dispatching Alert...</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Dispatch Reminder Alert</span>
                                </span>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

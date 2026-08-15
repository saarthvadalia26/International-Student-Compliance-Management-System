"use client";

import * as React from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  UploadCloud, 
  Calendar, 
  CalendarDays, 
  Check, 
  X, 
  Loader2 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDateEngine } from "@/domain/notifications/services/calendar-date";

export interface DocumentField {
  label: string;
  value?: string | null;
  isMono?: boolean;
  isDate?: boolean;
  fallback?: string;
}

export interface StudentDocumentCardProps {
  documentType: "passport" | "visa" | "efrro";
  title: string;
  description: string;
  studentId: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  placeOfIssue?: string | null;
  visaType?: string | null;
  versionNumber?: number | null;
  verificationStatus?: "not_uploaded" | "pending" | "verified" | "rejected" | null;
  hasUploadedDocument?: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  filePath?: string | null;
  daysToExpiry?: number | null;
  onUploadRenewalClick: () => void;
  onCorrectExpiryClick: () => void;
  onCorrectMetadataClick: () => void;
  onApproveClick?: () => void;
  onRejectClick?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  customFields?: DocumentField[];
}

export function StudentDocumentCard({
  documentType,
  title,
  description,
  studentId,
  documentNumber,
  issueDate,
  expiryDate,
  placeOfIssue,
  visaType,
  versionNumber = null,
  verificationStatus = "not_uploaded",
  hasUploadedDocument = false,
  verifiedAt,
  verifiedBy,
  rejectionReason,
  daysToExpiry,
  onUploadRenewalClick,
  onCorrectExpiryClick,
  onCorrectMetadataClick,
  onApproveClick,
  onRejectClick,
  isApproving = false,
  isRejecting = false,
  customFields
}: StudentDocumentCardProps): React.JSX.Element {
  // 1. Authoritative Expiry & Health Computation
  const cleanExpiry = expiryDate ? expiryDate.split("T")[0].trim() : "";
  const hasValidExpiry = Boolean(
    cleanExpiry && 
    cleanExpiry !== "Not provided" && 
    cleanExpiry !== "Not Recorded" && 
    /^\d{4}-\d{2}-\d{2}$/.test(cleanExpiry)
  );

  const cleanIssue = issueDate ? issueDate.split("T")[0].trim() : "";
  const hasValidIssue = Boolean(
    cleanIssue && 
    cleanIssue !== "Not provided" && 
    cleanIssue !== "Not Recorded" && 
    /^\d{4}-\d{2}-\d{2}$/.test(cleanIssue)
  );

  const resolvedDaysLeft = React.useMemo(() => {
    if (!hasValidExpiry) return null;
    if (typeof daysToExpiry === "number" && !isNaN(daysToExpiry)) return daysToExpiry;
    return CalendarDateEngine.diffCalendarDays(cleanExpiry, CalendarDateEngine.getTodayISO());
  }, [hasValidExpiry, cleanExpiry, daysToExpiry]);

  const expiryHealth = React.useMemo(() => {
    if (!hasValidExpiry) {
      return {
        statusText: "No expiry date recorded",
        badgeLabel: "No Expiry Recorded",
        badgeVariant: "outline" as const,
        badgeClass: "text-muted-foreground border-border/60 bg-muted/20",
        isExpired: false,
        isCritical: false,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft < 0) {
      const rel = resolvedDaysLeft === -1 ? "Expired yesterday" : `Expired ${Math.abs(resolvedDaysLeft)} days ago`;
      return {
        statusText: rel,
        badgeLabel: "Expired",
        badgeVariant: "destructive" as const,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        isExpired: true,
        isCritical: false,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft <= 15) {
      const rel = resolvedDaysLeft === 0 ? "Expires today" : resolvedDaysLeft === 1 ? "Expires tomorrow" : `Expires in ${resolvedDaysLeft} days`;
      return {
        statusText: `Critical · ${rel}`,
        badgeLabel: `Critical (${resolvedDaysLeft}d)`,
        badgeVariant: "destructive" as const,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        isExpired: false,
        isCritical: true,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft <= 30) {
      return {
        statusText: `Expires soon · ${resolvedDaysLeft} days remaining`,
        badgeLabel: `Expires soon (${resolvedDaysLeft}d)`,
        badgeVariant: "outline" as const,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        isExpired: false,
        isCritical: false,
        isWarning: true
      };
    }

    return {
      statusText: `Valid · ${resolvedDaysLeft} days remaining`,
      badgeLabel: `Valid (${resolvedDaysLeft}d)`,
      badgeVariant: "outline" as const,
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      isExpired: false,
      isCritical: false,
      isWarning: false
    };
  }, [hasValidExpiry, resolvedDaysLeft]);

  // 2. Semantic Status Icon
  const renderStatusIcon = () => {
    if (!hasUploadedDocument || verificationStatus === "not_uploaded") {
      return <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30 shrink-0" />;
    }
    if (verificationStatus === "rejected") {
      return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (verificationStatus === "pending") {
      return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (expiryHealth.isExpired) {
      return <XCircle className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (expiryHealth.isCritical || expiryHealth.isWarning) {
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  };

  // 3. Semantic Verification Badge
  const renderVerificationBadge = () => {
    if (!hasUploadedDocument || verificationStatus === "not_uploaded") {
      return (
        <Badge variant="outline" className="text-[10px] h-5 font-medium text-muted-foreground border-border/60 bg-muted/10">
          Not Uploaded
        </Badge>
      );
    }
    if (verificationStatus === "verified") {
      if (expiryHealth.isExpired) {
        return (
          <Badge variant="destructive" className="text-[10px] h-5 font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Expired
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-[10px] h-5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Verified
        </Badge>
      );
    }
    if (verificationStatus === "rejected") {
      return (
        <Badge variant="destructive" className="text-[10px] h-5 font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] h-5 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending Verification
      </Badge>
    );
  };

  // 4. Default Information Fields
  const fieldsToRender: DocumentField[] = customFields || (() => {
    if (documentType === "passport") {
      return [
        { label: "Passport Number", value: documentNumber, isMono: true },
        { label: "Place of Issue", value: placeOfIssue },
        { label: "Issue Date", value: hasValidIssue ? CalendarDateEngine.formatDateDisplay(cleanIssue) : null, isDate: true },
        { label: "Expiration Date", value: hasValidExpiry ? CalendarDateEngine.formatDateDisplay(cleanExpiry) : null, isDate: true }
      ];
    }
    if (documentType === "visa") {
      return [
        { label: "Visa Number", value: documentNumber, isMono: true },
        { label: "Visa Classification", value: visaType || "Student (S-1)" },
        { label: "Issue Date", value: hasValidIssue ? CalendarDateEngine.formatDateDisplay(cleanIssue) : null, isDate: true },
        { label: "Expiration Date", value: hasValidExpiry ? CalendarDateEngine.formatDateDisplay(cleanExpiry) : null, isDate: true }
      ];
    }
    return [
      { label: "Certificate Number", value: documentNumber, isMono: true },
      { label: "Issue Date", value: hasValidIssue ? CalendarDateEngine.formatDateDisplay(cleanIssue) : null, isDate: true },
      { label: "Expiration Date", value: hasValidExpiry ? CalendarDateEngine.formatDateDisplay(cleanExpiry) : null, isDate: true }
    ];
  })();

  return (
    <Card className="border border-border/70 shadow-xs overflow-hidden bg-card transition-all">
      {/* 1. DOCUMENT HEADER */}
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/15 border-b border-border/40 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {renderStatusIcon()}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xs sm:text-sm font-bold tracking-tight uppercase text-foreground truncate">
                {title}
              </CardTitle>
              {hasUploadedDocument && versionNumber ? (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 h-4 text-muted-foreground border-border/60 bg-muted/20 shrink-0">
                  CURRENT · V{versionNumber}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="text-[10px] font-caption text-muted-foreground truncate">
              {description}
            </CardDescription>
          </div>
        </div>

        <div className="shrink-0">
          {renderVerificationBadge()}
        </div>
      </CardHeader>

      {/* 2. CARD CONTENT */}
      <CardContent className="p-4 space-y-4 text-xs">
        {/* Responsive Information Grid */}
        <div className={`grid gap-3.5 ${
          fieldsToRender.length >= 4 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" 
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {fieldsToRender.map((f, idx) => {
            const hasVal = Boolean(f.value && f.value !== "Not provided" && f.value !== "Not Recorded");
            return (
              <div key={idx} className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground block font-caption uppercase tracking-wider truncate">
                  {f.label}
                </span>
                <span className={`block truncate ${
                  f.isMono ? "font-mono font-semibold text-xs sm:text-sm text-foreground" : "font-medium text-xs text-foreground"
                }`}>
                  {hasVal ? (
                    f.value
                  ) : (
                    <span className="text-muted-foreground/70 font-normal font-sans text-xs">
                      {f.fallback || "Not provided"}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3. INTEGRATED EXPIRATION & VALIDITY SUMMARY REGION */}
        <div className="rounded-lg border border-border/70 bg-muted/30 dark:bg-muted/15 p-3 sm:p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-caption flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                  {documentType === "efrro" ? "Expiration & Compliance" : "Expiration & Validity"}
                </span>
                {documentType === "efrro" && hasValidExpiry && (
                  <Badge variant="outline" className="text-[9px] h-4 font-normal text-primary border-primary/30 bg-primary/5">
                    Reminder schedule active
                  </Badge>
                )}
              </div>

              {hasValidExpiry ? (
                <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
                  <span className="text-sm sm:text-base font-bold text-foreground font-mono">
                    {CalendarDateEngine.formatDateDisplay(cleanExpiry)}
                  </span>
                  <span className={`text-xs font-semibold ${
                    expiryHealth.isExpired 
                      ? "text-rose-600 dark:text-rose-400" 
                      : expiryHealth.isCritical 
                      ? "text-rose-600 dark:text-rose-400"
                      : expiryHealth.isWarning 
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    ({expiryHealth.statusText})
                  </span>
                </div>
              ) : (
                <div className="pt-0.5">
                  <span className="text-xs text-muted-foreground italic font-caption">
                    No expiry date recorded
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons in Expiry Section */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold px-3 border-primary/30 hover:bg-primary/5 text-primary shadow-2xs"
                onClick={onUploadRenewalClick}
              >
                <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload New Document
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium px-2.5 text-muted-foreground hover:text-foreground border border-border/50 hover:border-border/80"
                onClick={onCorrectExpiryClick}
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Correct Expiry Date
              </Button>
            </div>
          </div>
        </div>

        {/* 4. VERIFICATION / AUDIT METADATA LINE */}
        {verifiedAt && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Verified on {new Date(verifiedAt).toLocaleDateString()}</span>
            {verifiedBy && <span className="text-muted-foreground/60">· Staff ID: {verifiedBy.substring(0, 8)}...</span>}
          </div>
        )}

        {verificationStatus === "rejected" && rejectionReason && (
          <div className="flex items-start gap-2 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-md p-2">
            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span><strong>Rejection Reason:</strong> {rejectionReason}</span>
          </div>
        )}

        {/* 5. DOCUMENT CARD FOOTER ACTIONS */}
        <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href={`/students/${studentId}/${documentType}`} 
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-primary/5 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> View Document & History
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              onClick={onCorrectMetadataClick}
            >
              <Edit3 className="mr-1 h-3 w-3" /> Correct Information
            </Button>
          </div>

          {verificationStatus === "pending" && (
            <div className="flex items-center gap-2">
              {onRejectClick && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isRejecting || isApproving}
                  className="h-7 text-xs px-2.5 text-rose-600 hover:bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50 dark:hover:bg-rose-950/20"
                  onClick={onRejectClick}
                >
                  {isRejecting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />} Reject Upload
                </Button>
              )}
              {onApproveClick && (
                <Button 
                  size="sm" 
                  disabled={isRejecting || isApproving}
                  className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                  onClick={onApproveClick}
                >
                  {isApproving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />} Approve Verification
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

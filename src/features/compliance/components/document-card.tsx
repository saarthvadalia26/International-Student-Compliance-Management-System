import * as React from "react";
import { UploadCloud, Eye, FileText, Edit3, ShieldCheck, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComplianceStatusBadge, ExpiryStatusBadge } from "./compliance-status";
import { DocumentConfig, ComplianceStatus, getDocumentTheme } from "../constants/constants";

import { CalendarDateEngine } from "@/domain/notifications/services/calendar-date";

export { StudentDocumentCard } from "./student-document-card";
export type { StudentDocumentCardProps, DocumentField } from "./student-document-card";

interface DocumentCardProps {
  config: DocumentConfig;
  status: ComplianceStatus;
  documentNumber: string | null;
  expiryDate: string | null;
  issueDate: string | null;
  daysLeft: number | null;
  onReplaceClick: () => void;
  onCorrectClick?: () => void;
  onVerifyClick?: () => void;
  onViewPdfClick?: () => void;
}

export function ComplianceDocumentCard({
  config,
  status,
  documentNumber,
  expiryDate,
  issueDate,
  daysLeft,
  onReplaceClick,
  onCorrectClick,
  onVerifyClick,
  onViewPdfClick
}: DocumentCardProps): React.JSX.Element {
  const theme = getDocumentTheme(config.type);
  const DocumentIcon = config.icon;
  const isDocumentUploaded = status !== "MISSING" && status !== "NOT_UPLOADED" && status !== "METADATA_ONLY";

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

  const hasMetadata = Boolean(
    hasValidExpiry || 
    (documentNumber && documentNumber !== "Not provided" && documentNumber !== "Not Recorded" && documentNumber !== "Pending")
  );

  return (
    <Card className="border border-border/70 shadow-xs bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.iconContainerClass}`}>
              <DocumentIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full shrink-0 ${theme.dotClass}`} />
                <CardTitle className="text-sm font-semibold">{config.title}</CardTitle>
              </div>
              <CardDescription className="text-xs font-caption">{config.description}</CardDescription>
            </div>
          </div>
          <ComplianceStatusBadge status={hasMetadata && !isDocumentUploaded ? "METADATA_ONLY" : status} />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {isDocumentUploaded || hasMetadata ? (
          <div className="space-y-4">
            {!isDocumentUploaded && hasMetadata && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg ${theme.bannerClass} text-xs`}>
                <Info className={`h-4 w-4 shrink-0 mt-0.5 ${theme.bannerIconClass}`} />
                <div className="space-y-0.5">
                  <span className={`font-semibold text-xs ${theme.bannerTitleClass}`}>Metadata Available — Document Copy Not Uploaded</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This student record contains {config.title.toLowerCase()} metadata from registration / Excel migration. Expiry tracking is active, but no physical PDF/image file has been uploaded yet.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block font-caption uppercase tracking-wider">Document Identifier</span>
                  <span className="font-mono font-semibold text-foreground block text-sm">{documentNumber || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground block font-caption uppercase tracking-wider">Issue Date</span>
                    <span className="font-medium text-foreground block text-xs">{hasValidIssue ? CalendarDateEngine.formatDateDisplay(cleanIssue) : "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground block font-caption uppercase tracking-wider">Expiry Date</span>
                    <span className="font-medium text-foreground block text-xs">{hasValidExpiry ? CalendarDateEngine.formatDateDisplay(cleanExpiry) : "Not provided"}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block font-caption uppercase tracking-wider">Compliance Expiry Tracking</span>
                  <ExpiryStatusBadge daysLeft={daysLeft} />
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
                  {onViewPdfClick && isDocumentUploaded && (
                    <Button variant="outline" size="sm" className="h-8 text-xs flex-1 md:flex-initial" onClick={onViewPdfClick}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View PDF
                    </Button>
                  )}
                  {onCorrectClick && (
                    <Button variant="outline" size="sm" className="h-8 text-xs flex-1 md:flex-initial" onClick={onCorrectClick}>
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Correct Info
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className={`h-8 text-xs flex-1 md:flex-initial ${theme.buttonOutlineClass}`} onClick={onReplaceClick}>
                    <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> {isDocumentUploaded ? "Upload New Version" : "Upload Document File"}
                  </Button>
                  {status === "PENDING_VERIFICATION" && onVerifyClick && (
                    <Button size="sm" className="h-8 text-xs flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={onVerifyClick}>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Verify Document
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground font-caption mb-3">No document file or metadata recorded for this student.</p>
            <Button size="sm" className="h-8 text-xs" onClick={onReplaceClick}>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload {config.title} File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

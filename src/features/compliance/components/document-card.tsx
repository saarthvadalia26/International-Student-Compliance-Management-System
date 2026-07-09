import * as React from "react";
import { RefreshCw, Eye, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComplianceStatusBadge, ExpiryStatusBadge } from "./compliance-status";
import { DocumentConfig, ComplianceStatus } from "../constants/constants";

interface DocumentCardProps {
  config: DocumentConfig;
  status: ComplianceStatus;
  documentNumber: string | null;
  expiryDate: string | null;
  issueDate: string | null;
  daysLeft: number | null;
  onReplaceClick: () => void;
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
  onVerifyClick,
  onViewPdfClick
}: DocumentCardProps): React.JSX.Element {
  const DocumentIcon = config.icon;
  const isDocumentUploaded = status !== "MISSING";

  return (
    <Card className="border border-border/60 shadow-sm bg-card/65 backdrop-blur-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DocumentIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{config.title}</CardTitle>
              <CardDescription className="text-xs font-caption">{config.description}</CardDescription>
            </div>
          </div>
          <ComplianceStatusBadge status={status} />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {isDocumentUploaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground block font-caption">Document Identifier</span>
                <span className="font-semibold text-foreground block">{documentNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block font-caption">Issue Date</span>
                  <span className="font-medium text-foreground block">{issueDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-caption">Expiry Date</span>
                  <span className="font-semibold text-foreground block">{expiryDate}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-muted-foreground block font-caption">Compliance Expiry Tracking</span>
                <ExpiryStatusBadge daysLeft={daysLeft} />
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
                {onViewPdfClick && (
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 md:flex-initial" onClick={onViewPdfClick}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View PDF
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs flex-1 md:flex-initial" onClick={onReplaceClick}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Replace PDF
                </Button>
                {status === "PENDING_VERIFICATION" && onVerifyClick && (
                  <Button size="sm" className="h-8 text-xs flex-1 md:flex-initial" onClick={onVerifyClick}>
                    Verify Document
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground font-caption mb-3">No active document uploaded for this student.</p>
            <Button size="sm" className="h-8 text-xs" onClick={onReplaceClick}>
              Upload {config.title} PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

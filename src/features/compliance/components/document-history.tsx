import * as React from "react";
import { FileText, ArrowDownToLine, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComplianceDocumentType, getDocumentTheme } from "../constants/constants";

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  isActive: boolean;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string | null;
  visaType?: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason: string | null;
  notes?: string | null;
  uploadedAt: string;
  filePath?: string | null;
}

interface ComplianceDocumentTableProps {
  versions: DocumentVersion[];
  documentType?: ComplianceDocumentType;
  onDownloadClick?: (version: DocumentVersion) => void;
}

export function ComplianceDocumentTable({ versions, documentType = "passport", onDownloadClick }: ComplianceDocumentTableProps): React.JSX.Element {
  const theme = getDocumentTheme(documentType);

  const getVerificationBadge = (status: DocumentVersion["verificationStatus"]) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium text-[10px] h-5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium text-[10px] h-5 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium text-[10px] h-5 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  const getFileName = (filePath?: string | null) => {
    if (!filePath) return "document.pdf";
    const raw = filePath.split("/").pop() || "document.pdf";
    // Strip timestamp prefix if formatted as {timestamp}_{filename}
    return raw.replace(/^\d+_/, "");
  };

  if (versions.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground font-caption">
        No document versions have been uploaded yet.
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <Table className="text-xs">
        <TableHeader className="bg-muted/15 border-b border-border/40">
          <TableRow>
            <TableHead className="w-28 font-semibold">Version</TableHead>
            <TableHead className="font-semibold">Document File</TableHead>
            <TableHead className="font-semibold">Document Number</TableHead>
            <TableHead className="font-semibold">Validity Dates</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Uploaded Date</TableHead>
            {onDownloadClick && <TableHead className="w-20 text-right font-semibold">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((ver) => (
            <TableRow key={ver.id} className={ver.isActive ? `${theme.bgSoft}` : ""}>
              <TableCell className="font-medium">
                {ver.isActive ? (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 font-semibold ${theme.badgeClass}`}>
                    CURRENT · V{ver.versionNumber}
                  </Badge>
                ) : (
                  <span className="font-mono text-muted-foreground font-medium pl-1">
                    v{ver.versionNumber}
                  </span>
                )}
              </TableCell>
              <TableCell className="max-w-[180px]">
                <div className="flex items-center gap-1.5 min-w-0" title={ver.filePath || undefined}>
                  <FileText className={`h-3.5 w-3.5 shrink-0 ${theme.accentColor}`} />
                  <span className="truncate font-medium text-foreground text-xs">
                    {getFileName(ver.filePath)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono font-semibold">{ver.documentNumber}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-[11px]">
                {ver.issueDate ? `${ver.issueDate} → ${ver.expiryDate}` : ver.expiryDate}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  {getVerificationBadge(ver.verificationStatus)}
                  {ver.verificationStatus === "rejected" && ver.rejectionReason && (
                    <span className="text-[10px] text-rose-500 block max-w-xs truncate font-caption">
                      {ver.rejectionReason}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px]">{ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleDateString() : "—"}</TableCell>
              {onDownloadClick && (
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-xs ${theme.accentColor} ${theme.bgHover} flex items-center gap-1`}
                    onClick={() => onDownloadClick(ver)} 
                    title="Download physical document file"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>View</span>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ComplianceDocumentTimeline({ versions, documentType = "passport" }: { versions: DocumentVersion[]; documentType?: ComplianceDocumentType }): React.JSX.Element {
  const theme = getDocumentTheme(documentType);

  if (versions.length === 0) {
    return <div className="text-center text-xs text-muted-foreground py-4">This student has not uploaded any document versions yet.</div>;
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
      {versions.map((ver) => (
        <div key={ver.id} className="relative flex items-start gap-4 text-xs">
          {/* Node dot */}
          <div className={`absolute -left-6 rounded-full border bg-background h-5 w-5 flex items-center justify-center p-0.5 ${
            ver.verificationStatus === "verified" ? "border-emerald-500 text-emerald-500" :
            ver.verificationStatus === "rejected" ? "border-rose-500 text-rose-500" :
            "border-amber-500 text-amber-500"
          }`}>
            <Clock className="h-3.5 w-3.5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-foreground">Version v{ver.versionNumber} Uploaded</span>
              {ver.isActive && (
                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 font-semibold ${theme.badgeClass}`}>
                  Current Active
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">{ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleDateString() : ""}</span>
            </div>
            <p className="text-muted-foreground font-caption leading-relaxed">
              Document identifier <span className="font-semibold text-foreground font-mono">{ver.documentNumber}</span> valid from {ver.issueDate} to {ver.expiryDate}.
            </p>
            {ver.notes && (
              <p className="text-[11px] text-muted-foreground/90 italic">
                &ldquo;{ver.notes}&rdquo;
              </p>
            )}
            {ver.verificationStatus === "rejected" && ver.rejectionReason && (
              <div className="p-2 rounded bg-destructive/5 border border-destructive/10 max-w-md text-[10px] text-rose-500 font-caption flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                <span><strong>Rejection Reason</strong>: {ver.rejectionReason}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

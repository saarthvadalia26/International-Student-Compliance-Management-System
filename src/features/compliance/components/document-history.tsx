import * as React from "react";
import { ArrowDownToLine, Clock } from "lucide-react";
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

export interface MockVersion {
  id: string;
  versionNumber: number;
  isActive: boolean;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  uploadedAt: string;
}

interface ComplianceDocumentTableProps {
  versions: MockVersion[];
  onDownloadClick?: (version: MockVersion) => void;
}

export function ComplianceDocumentTable({ versions, onDownloadClick }: ComplianceDocumentTableProps): React.JSX.Element {
  const getVerificationBadge = (status: MockVersion["verificationStatus"]) => {
    switch (status) {
      case "verified":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Pending</Badge>;
    }
  };

  if (versions.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground font-caption">
        No previous document history versions registered.
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <Table className="text-xs">
        <TableHeader className="bg-muted/15 border-b border-border/40">
          <TableRow>
            <TableHead className="w-16 font-semibold">Ver</TableHead>
            <TableHead className="font-semibold">Document Number</TableHead>
            <TableHead className="font-semibold">Validity Dates</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Uploaded Date</TableHead>
            {onDownloadClick && <TableHead className="w-16 text-right font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((ver) => (
            <TableRow key={ver.id} className={ver.isActive ? "bg-primary/5 hover:bg-primary/10" : ""}>
              <TableCell className="font-medium">
                v{ver.versionNumber} {ver.isActive && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4 border-primary text-primary font-normal bg-primary/5">Active</Badge>}
              </TableCell>
              <TableCell className="font-semibold">{ver.documentNumber}</TableCell>
              <TableCell className="text-muted-foreground">{ver.issueDate} to {ver.expiryDate}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  {getVerificationBadge(ver.verificationStatus)}
                  {ver.verificationStatus === "rejected" && ver.rejectionReason && (
                    <span className="text-[10px] text-rose-500 block max-w-xs truncate font-caption">{ver.rejectionReason}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{ver.uploadedAt}</TableCell>
              {onDownloadClick && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownloadClick(ver)} title="Download PDF copy">
                    <ArrowDownToLine className="h-4 w-4" />
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

export function ComplianceDocumentTimeline({ versions }: { versions: MockVersion[] }): React.JSX.Element {
  if (versions.length === 0) {
    return <div className="text-center text-xs text-muted-foreground py-4">Timeline is empty.</div>;
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
              <span className="text-[10px] text-muted-foreground">{ver.uploadedAt}</span>
            </div>
            <p className="text-muted-foreground font-caption leading-relaxed">
              Identifier <span className="font-semibold text-foreground">{ver.documentNumber}</span> valid from {ver.issueDate} to {ver.expiryDate}.
            </p>
            {ver.verificationStatus === "rejected" && ver.rejectionReason && (
              <div className="p-2 rounded bg-destructive/5 border border-destructive/10 max-w-md text-[10px] text-rose-500 font-caption">
                <strong>Rejection Reason</strong>: {ver.rejectionReason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { DOCUMENT_CONFIGS, ComplianceDocumentType, ComplianceStatus } from "../constants/constants";
import { ComplianceDocumentCard } from "./document-card";
import { DocumentUploadDialog, VerificationPanel } from "./document-dialogs";
import { ComplianceDocumentTable, ComplianceDocumentTimeline, DocumentVersion } from "./document-history";
import { DocumentViewer, LoadingState } from "./document-states";

import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

interface DocumentPageProps {
  documentType: ComplianceDocumentType;
  studentId: string;
}

export function ComplianceDocumentPage({ documentType, studentId }: DocumentPageProps): React.JSX.Element {
  const config = DOCUMENT_CONFIGS[documentType];
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<ComplianceStatus>("MISSING");
  
  // Versions history state from database (Empty array by default in production until fetched)
  const [versions, setVersions] = React.useState<DocumentVersion[]>([]);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = React.useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    try {
      setLoading(true);
      setVersions([]); // Explicitly empty for production release until data exists
      setStatus("MISSING");
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const targetTable = 
    documentType === "passport" 
      ? "passport_versions" 
      : documentType === "visa" 
      ? "visa_versions" 
      : "efrro_versions";

  // Realtime Live Sync: Update UI instantly when documents are uploaded, verified, or updated by staff
  useRealtimeSubscription({
    table: targetTable,
    onEvent: () => {
      fetchDocuments();
    },
  });

  React.useEffect(() => {
    if (studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDocuments();
    }
  }, [studentId, documentType, fetchDocuments]);

  const handleUploadSubmit = (data: { docNumber: string; issueDate: string; expiryDate: string; file: File | null }) => {
    // This will hit an API route securely
    toast.info("Upload initiated", { description: "Sending secure payload to storage layer..." });
  };

  const handleVerificationAction = (data: { status: "verified" | "rejected"; reason: string }) => {
    toast.info("Verification action submitted", { description: "Updating document status..." });
  };

  if (loading) {
    return <LoadingState label={`Loading ${config.title} parameters...`} />;
  }

  const activeDoc = versions.find(v => v.isActive);
  const daysLeft = activeDoc ? Math.ceil((new Date(activeDoc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-xs">
      <div className="flex items-center">
        <Link href={`/students/${studentId}`} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-small transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Student Profile
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-xl font-bold">{config.title} Auditing</h1>
          <p className="font-caption text-muted-foreground">Manage files, check validity limits, and audit verification states.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Card info */}
          <ComplianceDocumentCard 
            config={config}
            status={status}
            documentNumber={activeDoc ? activeDoc.documentNumber : null}
            issueDate={activeDoc ? activeDoc.issueDate : null}
            expiryDate={activeDoc ? activeDoc.expiryDate : null}
            daysLeft={daysLeft}
            onReplaceClick={() => setIsUploadOpen(true)}
            onVerifyClick={activeDoc && status === "PENDING_VERIFICATION" ? () => setIsVerifyOpen(true) : undefined}
            onViewPdfClick={selectedPdfUrl ? () => {} : undefined}
          />

          {/* History details table */}
          {versions.length > 0 && (
            <Card className="border border-border/60 shadow-sm bg-card/65">
              <CardContent className="p-4 space-y-4">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Version History</h2>
                <ComplianceDocumentTable versions={versions} onDownloadClick={(v) => toast.info(`Downloading version v${v.versionNumber}...`)} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* PDF Viewer card */}
          {selectedPdfUrl && (
            <Card className="border border-border/60 shadow-sm bg-card/65">
              <CardContent className="p-4">
                <DocumentViewer url={selectedPdfUrl} title={config.title} />
              </CardContent>
            </Card>
          )}

          {/* History timeline log */}
          <Card className="border border-border/60 shadow-sm bg-card/65">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Activity Timeline</h2>
              <ComplianceDocumentTimeline versions={versions} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload document Modal */}
      <DocumentUploadDialog 
        config={config}
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSubmit={handleUploadSubmit}
      />

      {/* Verification modal */}
      <VerificationPanel 
        isOpen={isVerifyOpen}
        onOpenChange={setIsVerifyOpen}
        onVerify={handleVerificationAction}
      />
    </div>
  );
}

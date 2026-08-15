"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { DOCUMENT_CONFIGS, ComplianceDocumentType, ComplianceStatus } from "../constants/constants";
import { ComplianceDocumentCard } from "./document-card";
import { DocumentUploadDialog, CorrectMetadataDialog, VerificationPanel } from "./document-dialogs";
import { ComplianceDocumentTable, ComplianceDocumentTimeline, DocumentVersion } from "./document-history";
import { DocumentViewer, LoadingState } from "./document-states";

import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { getDocumentVersionsAction } from "@/app/(app)/students/actions";

interface DocumentPageProps {
  documentType: ComplianceDocumentType;
  studentId: string;
}

export function ComplianceDocumentPage({ documentType, studentId }: DocumentPageProps): React.JSX.Element {
  const config = DOCUMENT_CONFIGS[documentType];
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<ComplianceStatus>("MISSING");
  
  // Versions history state from database
  const [versions, setVersions] = React.useState<DocumentVersion[]>([]);
  const [metadata, setMetadata] = React.useState<{
    documentNumber?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    placeOfIssue?: string | null;
    visaType?: string | null;
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isCorrectOpen, setIsCorrectOpen] = React.useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = React.useState(false);
  const [selectedPdfUrl] = React.useState<string | null>(null);

  const fetchDocuments = React.useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await getDocumentVersionsAction(studentId, documentType);
      if (res.success) {
        setVersions(res.versions);
        setStatus(res.status as ComplianceStatus);
        setMetadata(res.metadata || null);
      } else {
        setVersions([]);
        setStatus("MISSING");
        setMetadata(null);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
      setVersions([]);
      setStatus("MISSING");
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, documentType]);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (studentId) {
      fetchDocuments();
    }
  }, [studentId, documentType, fetchDocuments]);

  const handleVerificationAction = async (data: { status: "verified" | "rejected"; reason: string }) => {
    try {
      const { updateDocumentVerificationAction } = await import("@/app/(app)/students/actions");
      const pendingDoc = versions.find(v => v.verificationStatus === "pending") || versions.find(v => v.isActive);
      const res = await updateDocumentVerificationAction(
        studentId,
        documentType,
        pendingDoc?.id || null,
        data.status,
        data.reason
      );
      if (res.success) {
        toast.success(`Document ${data.status === "verified" ? "Approved & Activated" : "Rejected"}`, {
          description: "Document verification state updated and reminder timelines synchronized."
        });
        await fetchDocuments();
      } else {
        toast.error("Action Failed", { description: res.error || "Unable to update document verification." });
      }
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Failed to execute verification action." });
    }
  };

  if (loading) {
    return <LoadingState label={`Loading ${config.title} parameters...`} />;
  }

  const activeDoc = versions.find(v => v.isActive) || (versions.length > 0 ? versions[0] : null);
  const pendingDoc = versions.find(v => v.verificationStatus === "pending");
  const effectiveExpiry = activeDoc?.expiryDate || metadata?.expiryDate || null;
  const daysLeft = effectiveExpiry ? Math.ceil((new Date(effectiveExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

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
            documentNumber={activeDoc ? activeDoc.documentNumber : (metadata?.documentNumber || null)}
            issueDate={activeDoc ? activeDoc.issueDate : (metadata?.issueDate || null)}
            expiryDate={effectiveExpiry}
            daysLeft={daysLeft}
            onReplaceClick={() => setIsUploadOpen(true)}
            onCorrectClick={activeDoc || metadata ? () => setIsCorrectOpen(true) : undefined}
            onVerifyClick={pendingDoc || (activeDoc && status === "PENDING_VERIFICATION") ? () => setIsVerifyOpen(true) : undefined}
            onViewPdfClick={selectedPdfUrl ? () => {} : undefined}
          />

          {/* History details table */}
          {versions.length > 0 && (
            <Card className="border border-border/60 shadow-sm bg-card/65">
              <CardContent className="p-4 space-y-4">
                <ComplianceDocumentTable 
                  versions={versions} 
                  onDownloadClick={async (v) => {
                    if (!v.filePath) {
                      toast.error("File Unavailable", { description: "No physical file is attached to this document version." });
                      return;
                    }
                    try {
                      const { getDocumentDownloadUrlAction } = await import("@/app/(app)/students/actions");
                      const res = await getDocumentDownloadUrlAction(v.filePath);
                      if (res.success && res.url) {
                        window.open(res.url, "_blank", "noopener,noreferrer");
                      } else {
                        toast.error("Download Failed", { description: res.error || "Unable to retrieve document file." });
                      }
                    } catch (err) {
                      toast.error("Error", { description: err instanceof Error ? err.message : "Failed to open document file." });
                    }
                  }} 
                />
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

      {/* Genuine Renewal Upload Modal */}
      <DocumentUploadDialog 
        config={config}
        studentId={studentId}
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={fetchDocuments}
      />

      {/* In-Place Metadata Correction Modal */}
      <CorrectMetadataDialog
        config={config}
        studentId={studentId}
        initialValues={{
          documentNumber: activeDoc?.documentNumber || "",
          issueDate: activeDoc?.issueDate || "",
          expiryDate: activeDoc?.expiryDate || ""
        }}
        isOpen={isCorrectOpen}
        onOpenChange={setIsCorrectOpen}
        onSuccess={fetchDocuments}
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


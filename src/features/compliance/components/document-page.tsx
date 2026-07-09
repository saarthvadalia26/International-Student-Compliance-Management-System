"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { DOCUMENT_CONFIGS, ComplianceDocumentType, ComplianceStatus } from "../constants/constants";
import { ComplianceDocumentCard } from "./document-card";
import { DocumentUploadDialog, VerificationPanel } from "./document-dialogs";
import { ComplianceDocumentTable, ComplianceDocumentTimeline, MockVersion } from "./document-history";
import { DocumentViewer, LoadingState } from "./document-states";

interface DocumentPageProps {
  documentType: ComplianceDocumentType;
  studentId: string;
}

export function ComplianceDocumentPage({ documentType, studentId }: DocumentPageProps): React.JSX.Element {
  const config = DOCUMENT_CONFIGS[documentType];
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<ComplianceStatus>("MISSING");
  
  // Versions history state
  const [versions, setVersions] = React.useState<MockVersion[]>([]);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = React.useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Emulate API query delay
    const timer = setTimeout(() => {
      setLoading(false);
      // Mock initial data if studentId exists or is defined
      if (studentId) {
        setStatus("COMPLIANT");
        const mockVers: MockVersion[] = [
          {
            id: "v2-id",
            versionNumber: 2,
            isActive: true,
            documentNumber: "A-98765432",
            issueDate: "2024-01-10",
            expiryDate: "2029-01-09",
            verificationStatus: "verified",
            rejectionReason: null,
            uploadedAt: "2024-01-12 10:30"
          },
          {
            id: "v1-id",
            versionNumber: 1,
            isActive: false,
            documentNumber: "A-11112222",
            issueDate: "2019-01-10",
            expiryDate: "2024-01-09",
            verificationStatus: "verified",
            rejectionReason: null,
            uploadedAt: "2019-01-12 14:20"
          }
        ];
        setVersions(mockVers);
        setSelectedPdfUrl("https://arxiv.org/pdf/2312.00752.pdf"); // Mock online demo PDF
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [studentId, documentType]);

  const handleUploadSubmit = (data: { docNumber: string; issueDate: string; expiryDate: string; file: File | null }) => {
    const newVersion: MockVersion = {
      id: `v${versions.length + 1}-new-id`,
      versionNumber: versions.length + 1,
      isActive: true,
      documentNumber: data.docNumber,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      verificationStatus: "pending",
      rejectionReason: null,
      uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 16)
    };

    setVersions(prev => [newVersion, ...prev.map(v => ({ ...v, isActive: false }))]);
    setStatus("PENDING_VERIFICATION");
    setSelectedPdfUrl("https://arxiv.org/pdf/2312.00752.pdf");
    toast.success("Document version uploaded", { description: "Compliance status changed to pending verification." });
  };

  const handleVerificationAction = (data: { status: "verified" | "rejected"; reason: string }) => {
    setVersions(prev => prev.map((v, i) => {
      if (i === 0) {
        return {
          ...v,
          verificationStatus: data.status,
          rejectionReason: data.reason || null
        };
      }
      return v;
    }));

    if (data.status === "verified") {
      setStatus("COMPLIANT");
      toast.success("Document verified", { description: "Document approved. Student compliance refreshed successfully." });
    } else {
      setStatus("REJECTED");
      toast.error("Document rejected", { description: `Rejection remark logged: "${data.reason}"` });
    }
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
            onVerifyClick={() => setIsVerifyOpen(true)}
            onViewPdfClick={selectedPdfUrl ? () => {} : undefined}
          />

          {/* History details table */}
          <Card className="border border-border/60 shadow-sm bg-card/65">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Version History</h2>
              <ComplianceDocumentTable versions={versions} onDownloadClick={(v) => toast.info(`Downloading version v${v.versionNumber}...`)} />
            </CardContent>
          </Card>
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

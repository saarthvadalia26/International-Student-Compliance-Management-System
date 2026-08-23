"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Lock,
  FileCheck2,
  Globe2,
  Award,
  XCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { 
  uploadStudentDocumentAction, 
  fetchStudentProfile, 
  fetchDocumentUploadEligibilityAction,
  fetchDocumentUploadLimitAction,
  submitDocumentReplacementRequestAction,
  cancelDocumentReplacementRequestAction
} from "../../actions";
import { toast } from "sonner";
import { StudentPortalProfile } from "@/domain/student-portal/types";
import { 
  DocumentReplacementReason, 
  REASON_LABELS 
} from "@/domain/compliance/types/replacement-request.types";
import { DocumentCentreSkeleton } from "@/components/student/student-skeletons";
import { cn } from "@/lib/utils";

export default function DocumentCentrePage() {
  return (
    <React.Suspense fallback={<DocumentCentreSkeleton />}>
      <DocumentCentreContent />
    </React.Suspense>
  );
}

function DocumentCentreContent() {
  const supabase = getBrowserSupabase();
  const searchParams = useSearchParams();
  const typeParam = searchParams ? searchParams.get("type") : null;

  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeDocType, setActiveDocType] = React.useState<"passport" | "visa" | "efrro">("efrro");
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [eligibilityData, setEligibilityData] = React.useState<Record<string, any>>({});
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = React.useState<number>(10485760); // Default 10 MB
  const [maxUploadSizeMb, setMaxUploadSizeMb] = React.useState<number>(10);

  // Replacement Request Dialog state
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
  const [requestReason, setRequestReason] = React.useState<DocumentReplacementReason>("passport_renewed_early");
  const [requestDetails, setRequestDetails] = React.useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = React.useState(false);

  const actionParam = searchParams ? searchParams.get("action") : null;

  React.useEffect(() => {
    if (typeParam && ["passport", "visa", "efrro"].includes(typeParam)) {
      setActiveDocType(typeParam as "passport" | "visa" | "efrro");
    }
    if (actionParam === "request_replacement") {
      setIsRequestDialogOpen(true);
    }
  }, [typeParam, actionParam]);

  // Default reason tailored to active document type
  React.useEffect(() => {
    if (activeDocType === "passport") setRequestReason("passport_renewed_early");
    else if (activeDocType === "visa") setRequestReason("visa_renewed_reissued");
    else setRequestReason("efrro_reissued");
  }, [activeDocType]);

  const refreshProfileAndEligibility = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || "test_token";
      const [profileData, limitData] = await Promise.all([
        fetchStudentProfile(jwt),
        fetchDocumentUploadLimitAction()
      ]);
      if (profileData) {
        setProfile(profileData);
        setEligibilityData({
          passport: profileData.passportEligibility,
          visa: profileData.visaEligibility,
          efrro: profileData.efrroEligibility
        });
      }
      if (limitData?.maxUploadSizeBytes) {
        setMaxUploadSizeBytes(limitData.maxUploadSizeBytes);
        setMaxUploadSizeMb(limitData.maxUploadSizeMb);
      }
    } catch {
      // ignore
    }
  }, [supabase]);

  React.useEffect(() => {
    let mounted = true;
    async function initData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token || "test_token";
        const [profileData, limitData] = await Promise.all([
          fetchStudentProfile(jwt),
          fetchDocumentUploadLimitAction()
        ]);
        if (mounted) {
          if (profileData) {
            setProfile(profileData);
            setEligibilityData({
              passport: profileData.passportEligibility,
              visa: profileData.visaEligibility,
              efrro: profileData.efrroEligibility
            });
          }
          if (limitData?.maxUploadSizeBytes) {
            setMaxUploadSizeBytes(limitData.maxUploadSizeBytes);
            setMaxUploadSizeMb(limitData.maxUploadSizeMb);
          }
          setIsLoading(false);
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    }
    initData();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isUploadAllowed) {
      toast.error(`Your ${activeDocType.toUpperCase()} upload is currently locked.`);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxUploadSizeBytes) {
      toast.error(`This file is too large. The maximum allowed size is ${maxUploadSizeMb} MB.`);
      return;
    }

    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload PDF, JPG, or PNG.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    if (!isUploadAllowed) {
      toast.error(`Your ${activeDocType.toUpperCase()} upload is currently locked.`);
      return;
    }

    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || "test_token";

      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await uploadStudentDocumentAction(
          jwt,
          activeDocType,
          selectedFile.name,
          base64,
          null,
          navigator.userAgent
        );

        if (res.success) {
          toast.success(`${activeDocType.toUpperCase()} document submitted for verification!`);
          setSelectedFile(null);
          await refreshProfileAndEligibility();
        } else {
          toast.error(res.error || "Upload failed. Please try again.");
        }
        setIsUploading(false);
      };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload error.");
      setIsUploading(false);
    }
  };

  const handleSubmitReplacementRequest = async () => {
    const details = requestDetails.trim() || REASON_LABELS[requestReason] || "Document replacement requested by student.";
    if (requestReason === "other" && !requestDetails.trim()) {
      toast.error("Please provide additional explanation when selecting 'Other'.");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || "test_token";

      const res = await submitDocumentReplacementRequestAction(jwt, {
        documentType: activeDocType,
        reason: requestReason,
        reasonDetails: details
      });

      if (res.success) {
        toast.success(`Replacement request for ${activeDocType.toUpperCase()} submitted for staff review.`);
        setIsRequestDialogOpen(false);
        setRequestDetails("");
        await refreshProfileAndEligibility();
      } else {
        toast.error(res.error || "Failed to submit replacement request.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setIsCancellingRequest(true);
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || "test_token";

      const res = await cancelDocumentReplacementRequestAction(jwt, requestId);
      if (res.success) {
        toast.success("Replacement request cancelled.");
        await refreshProfileAndEligibility();
      } else {
        toast.error(res.error || "Failed to cancel request.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setIsCancellingRequest(false);
    }
  };

  if (isLoading) {
    return <DocumentCentreSkeleton />;
  }

  // Resolve current active doc eligibility
  const currentEligibility = eligibilityData[activeDocType] || (
    activeDocType === "passport" ? profile?.passportEligibility :
    activeDocType === "visa" ? profile?.visaEligibility : profile?.efrroEligibility
  ) || {
    canUpload: false,
    reasonCode: "OUTSIDE_WINDOW",
    userTitle: "Document Status",
    userMessage: "Document upload is currently locked."
  };

  const isUploadAllowed = Boolean(currentEligibility.canUpload);
  const activeReplRequest = currentEligibility.activeReplacementRequest;

  const activeDocExpiry = activeDocType === "passport" ? profile?.passportExpiry :
    activeDocType === "visa" ? profile?.visaExpiry : profile?.efrroExpiry;

  const activeDocNumber = activeDocType === "passport" ? profile?.passportNumber :
    activeDocType === "visa" ? profile?.visaNumber : profile?.efrroNumber;

  const activeDocStatus = activeDocType === "passport" ? profile?.passportStatus :
    activeDocType === "visa" ? profile?.visaStatus : profile?.efrroStatus;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Document Centre</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Secure document upload and compliance management for your Passport, Visa, and eFRRO certificates.
        </p>
      </div>

      {/* Document Type Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto scrollbar-none w-full min-w-0">
        {(["passport", "visa", "efrro"] as const).map((type) => (
          <Button
            key={type}
            variant={activeDocType === type ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveDocType(type); setSelectedFile(null); }}
            className="text-xs font-semibold uppercase tracking-wider h-8 rounded-xl px-4 flex items-center gap-1.5 shrink-0"
          >
            {type === "passport" && <FileCheck2 className="h-3.5 w-3.5" />}
            {type === "visa" && <Globe2 className="h-3.5 w-3.5" />}
            {type === "efrro" && <Award className="h-3.5 w-3.5" />}
            <span>{type}</span>
          </Button>
        ))}
      </div>

      {/* Main Upload / Eligibility Area & Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          
          {/* STATE 1: UPLOAD DISABLED */}
          {!isUploadAllowed ? (
            <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card space-y-5">
              
              {/* Header Icon & Title */}
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  currentEligibility.reasonCode === "PENDING_VERIFICATION" 
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}>
                  {currentEligibility.reasonCode === "PENDING_VERIFICATION" ? (
                    <Clock className="h-6 w-6 animate-pulse" />
                  ) : currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING" ? (
                    <Clock className="h-6 w-6 text-blue-500" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {currentEligibility.userTitle}
                    </h2>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                      currentEligibility.reasonCode === "PENDING_VERIFICATION"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    }`}>
                      {currentEligibility.reasonCode === "PENDING_VERIFICATION" ? "Pending Review" :
                       currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING" ? "Request Under Review" : "Valid & Active"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentEligibility.userMessage}
                  </p>
                </div>
              </div>

              {/* Informative Status Box */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5 text-xs">
                {activeDocExpiry && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Document Expiry Date
                    </span>
                    <span className="font-semibold text-foreground font-mono">{activeDocExpiry}</span>
                  </div>
                )}

                {currentEligibility.uploadWindowOpensDate && (
                  <div className="flex justify-between items-center border-t border-border/40 pt-2">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Automatic Upload Window Opens
                    </span>
                    <span className="font-semibold text-primary font-mono">{currentEligibility.uploadWindowOpensDate}</span>
                  </div>
                )}

                {currentEligibility.daysUntilWindowOpens !== null && currentEligibility.daysUntilWindowOpens !== undefined && currentEligibility.daysUntilWindowOpens > 0 && (
                  <div className="flex justify-between items-center border-t border-border/40 pt-2 text-muted-foreground">
                    <span>Window Opens In</span>
                    <span className="font-medium text-foreground">{currentEligibility.daysUntilWindowOpens} days</span>
                  </div>
                )}
              </div>

              {/* Rejected Request Notice if applicable */}
              {activeReplRequest?.status === "rejected" && activeReplRequest.rejectionReason && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1.5 text-rose-700 dark:text-rose-400">
                  <div className="font-bold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Previous Replacement Request Declined
                  </div>
                  <p className="text-[11px] leading-relaxed pl-5">
                    <strong>Reason:</strong> {activeReplRequest.rejectionReason}
                  </p>
                </div>
              )}

              {/* PENDING REPLACEMENT REQUEST STATUS */}
              {currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING" && activeReplRequest && (
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Replacement Request Under Review
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40">
                      Pending
                    </Badge>
                  </div>
                  <div className="text-muted-foreground space-y-1 pl-5.5">
                    <div><strong>Reason:</strong> {REASON_LABELS[activeReplRequest.reason as DocumentReplacementReason] || activeReplRequest.reason}</div>
                    <div><strong>Details:</strong> &ldquo;{activeReplRequest.reasonDetails}&rdquo;</div>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() => handleCancelRequest(activeReplRequest.id)}
                      disabled={isCancellingRequest}
                    >
                      {isCancellingRequest ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Cancel Request
                    </Button>
                  </div>
                </div>
              )}

              {/* REPLACEMENT REQUEST PROMPT (When upload is locked and no pending request) */}
              {currentEligibility.reasonCode !== "PENDING_VERIFICATION" && currentEligibility.reasonCode !== "REPLACEMENT_REQUEST_PENDING" && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      Request Document Replacement
                    </div>
                    {activeDocStatus === "APPROVED" || activeDocStatus === "COMPLIANT" ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        Verified
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    If your {activeDocType.toUpperCase()} has been renewed, replaced, damaged, or reissued by authorities, you can submit a replacement request for compliance review.
                  </p>
                  <Button
                    size="sm"
                    className="text-xs rounded-xl font-semibold gap-1.5 shadow-xs"
                    onClick={() => setIsRequestDialogOpen(true)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Request Replacement
                  </Button>
                </div>
              )}

              {/* Disabled Dropzone Visual Indicator */}
              <div 
                className="border-2 border-dashed border-border/60 rounded-2xl p-6 text-center bg-accent/10 opacity-70 cursor-not-allowed select-none transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.error("Uploads are currently locked for this document.");
                }}
              >
                <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">Upload Currently Locked</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                  {currentEligibility.reasonCode === "PENDING_VERIFICATION"
                    ? "A submission is currently under review. Additional uploads are disabled until compliance staff review this version."
                    : currentEligibility.reasonCode === "REPLACEMENT_REQUEST_PENDING"
                    ? "A replacement request is currently under review. Additional uploads are locked until staff decision."
                    : "Direct upload is disabled for verified documents. Please submit a replacement request to unlock the upload window."}
                </p>
                
                {/* Disabled hidden file input */}
                <input
                  type="file"
                  id="doc-file-input-locked"
                  className="hidden"
                  disabled={true}
                  aria-disabled="true"
                />

                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled 
                  aria-disabled="true"
                  className="mt-4 text-xs rounded-xl cursor-not-allowed pointer-events-none opacity-60 flex items-center gap-1.5 mx-auto"
                >
                  <Lock className="h-3 w-3" />
                  Upload Locked
                </Button>
              </div>
            </Card>
          ) : (
            /* STATE 2: UPLOAD ENABLED */
            <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card space-y-4">
              <CardHeader className="p-0 pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Upload New {activeDocType.toUpperCase()} Document
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {currentEligibility.userMessage}
                    </p>
                  </div>
                  {(currentEligibility.reasonCode === "REPLACEMENT_REQUEST_APPROVED" || currentEligibility.reasonCode === "EARLY_AUTHORIZATION_ACTIVE") && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-bold">
                      <Sparkles className="h-2.5 w-2.5" />
                      Replacement Approved
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-2 space-y-4">
                <div 
                  className="border-2 border-dashed border-primary/40 hover:border-primary rounded-2xl p-8 text-center bg-primary/5 transition-colors cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isUploadAllowed) {
                      toast.error("Uploads are currently locked for this document.");
                      return;
                    }
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      if (file.size > maxUploadSizeBytes) {
                        toast.error(`This file is too large. The maximum allowed size is ${maxUploadSizeMb} MB.`);
                        return;
                      }
                      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
                      if (!validTypes.includes(file.type)) {
                        toast.error("Unsupported file format. Please upload PDF, JPG, or PNG.");
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                >
                  <FileText className="h-10 w-10 text-primary mx-auto mb-3" />
                  <p className="text-xs font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : `Select your ${activeDocType.toUpperCase()} document file`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : `PDF, JPG, PNG • Maximum file size: ${maxUploadSizeMb} MB`}
                  </p>
                  
                  <input
                    type="file"
                    id="doc-file-input"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={isUploading || !isUploadAllowed}
                  />
                  
                  <label htmlFor="doc-file-input" className="inline-block mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      disabled={!isUploadAllowed}
                      className="text-xs pointer-events-none rounded-xl"
                    >
                      Browse Files
                    </Button>
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-xl"
                      disabled={isUploading}
                      onClick={() => setSelectedFile(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs font-semibold rounded-xl gap-2"
                      disabled={isUploading}
                      onClick={handleUploadSubmit}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>Submit {activeDocType.toUpperCase()}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Active Document Overview */}
        <div className="space-y-4">
          <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Document Status
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold uppercase text-foreground">{activeDocType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Document Number</span>
                <span className="font-mono font-semibold text-foreground">{activeDocNumber || "Not on file"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Expiry Date</span>
                <span className="font-mono font-semibold text-foreground">{activeDocExpiry || "Not set"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Document Version</span>
                <span className="font-mono font-semibold text-foreground">
                  {currentEligibility.isFirstUpload ? "—" : "v1"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn(
                  "text-[10px] uppercase font-bold",
                  activeDocStatus === "NOT_SUBMITTED" && activeDocExpiry
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                    : activeDocStatus === "APPROVED" || activeDocStatus === "COMPLIANT"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : ""
                )}>
                  {activeDocStatus === "NOT_SUBMITTED" && activeDocExpiry ? "Metadata Only (Copy Pending)" : (activeDocStatus || "Unverified")}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Compliance Help Notice */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Compliance Note
            </div>
            <p className="text-[11px] leading-relaxed">
              All international students must maintain valid Passport, Visa, and eFRRO documents. Replacement submissions are reviewed by the compliance office within 1–2 business days.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Request Document Replacement */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Request {activeDocType.toUpperCase()} Replacement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit a replacement request to the compliance office. Once approved, you will be granted an authorized window to upload your new physical document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Document Type</label>
              <Input value={activeDocType.toUpperCase()} disabled className="h-8 text-xs font-mono bg-muted" />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason for Replacement</label>
              <Select value={requestReason} onValueChange={(val) => setRequestReason(val as DocumentReplacementReason)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={activeDocType === "passport" ? "passport_renewed_early" : activeDocType === "visa" ? "visa_renewed_reissued" : "efrro_reissued"}>
                    Document Renewed
                  </SelectItem>
                  <SelectItem value="government_replacement">Document Replaced / New Booklet</SelectItem>
                  <SelectItem value="incorrect_document">Information Changed / Correction</SelectItem>
                  <SelectItem value="passport_damaged">Document Damaged</SelectItem>
                  <SelectItem value="passport_lost">Document Lost / Stolen</SelectItem>
                  <SelectItem value="other">Other Legitimate Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Additional Details / Explanation {requestReason === "other" ? "(Required)" : "(Optional)"}
              </label>
              <Textarea
                rows={3}
                placeholder="Describe the reason for replacement (e.g. Received new visa endorsement from embassy, or renewed passport booklet)..."
                value={requestDetails}
                onChange={e => setRequestDetails(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(false)} disabled={isSubmittingRequest}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmitReplacementRequest} 
              disabled={isSubmittingRequest || (requestReason === "other" && !requestDetails.trim())}
            >
              {isSubmittingRequest ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Submit Replacement Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

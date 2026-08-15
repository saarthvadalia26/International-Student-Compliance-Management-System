"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DocumentConfig } from "../constants/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadDocumentRenewalAction, correctDocumentMetadataAction } from "@/app/(app)/students/actions";
import { UploadCloud, Edit3, ShieldAlert } from "lucide-react";

interface UploadDialogProps {
  config: DocumentConfig;
  studentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Genuine Document Renewal / New Version Upload Modal
 */
export function DocumentUploadDialog({ config, studentId, isOpen, onOpenChange, onSuccess }: UploadDialogProps): React.JSX.Element {
  const [docNumber, setDocNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [placeOfIssue, setPlaceOfIssue] = React.useState("");
  const [visaType, setVisaType] = React.useState("Student (S-1)");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [uploadError, setUploadError] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(selected.type)) {
        toast.error("File Type Blocked", { description: "Only PDF and Image files (JPEG/PNG/WEBP) are allowed." });
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        toast.error("File Size Exceeded", { description: "File size must not exceed 5MB." });
        return;
      }
      setFile(selected);
      setIsDirty(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !issueDate || !expiryDate || !file) {
      toast.error("Required fields missing", { description: "Please populate document identifier, issue date, expiry date, and choose a file." });
      return;
    }
    
    if (new Date(expiryDate) <= new Date(issueDate)) {
      toast.error("Validation Error", { description: "Expiration date must be strictly after the issue date." });
      return;
    }

    setIsSubmitting(true);
    setUploadSuccess(false);
    setUploadError(false);

    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("documentType", config.type);
      formData.append("documentNumber", docNumber.trim());
      formData.append("issueDate", issueDate.trim());
      formData.append("expiryDate", expiryDate.trim());
      formData.append("placeOfIssue", placeOfIssue.trim());
      formData.append("visaType", visaType.trim());
      formData.append("notes", notes.trim() || "Renewed document upload");
      formData.append("file", file);

      const res = await uploadDocumentRenewalAction(formData);
      if (res.success) {
        setUploadSuccess(true);
        toast.success(`New ${config.title} Uploaded`, {
          description: `Version v${res.versionNumber || "new"} uploaded and set to Pending Verification. Existing active document remains active until approved.`
        });
        
        setTimeout(() => {
          onOpenChange(false);
          setDocNumber("");
          setIssueDate("");
          setExpiryDate("");
          setPlaceOfIssue("");
          setVisaType("Student (S-1)");
          setNotes("");
          setFile(null);
          setIsDirty(false);
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setUploadError(true);
        toast.error("Upload Failed", { description: res.error || "Unable to save document record." });
      }
    } catch (err) {
      setUploadError(true);
      toast.error("Error", { description: err instanceof Error ? err.message : "Failed to upload document." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && isDirty) {
      setIsConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(open);
    setIsDirty(false);
  };

  const handleConfirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    onOpenChange(false);
    setIsDirty(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary" />
              Upload New {config.title}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-muted-foreground text-xs leading-relaxed">
              Upload the newly issued {config.title.toLowerCase()} to create a new document version. The existing document will remain active in the student&apos;s record until this new document is reviewed and approved.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="docNumber">{config.fieldLabel} *</label>
                <Input 
                  id="docNumber" 
                  value={docNumber} 
                  onChange={(e) => { setDocNumber(e.target.value); setIsDirty(true); }} 
                  className="h-9 text-xs" 
                  placeholder="e.g. A-12345678" 
                />
              </div>

              {config.type === "passport" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="placeOfIssue">Place of Issue</label>
                  <Input 
                    id="placeOfIssue" 
                    value={placeOfIssue} 
                    onChange={(e) => { setPlaceOfIssue(e.target.value); setIsDirty(true); }} 
                    className="h-9 text-xs" 
                    placeholder="e.g. Tokyo / Berlin" 
                  />
                </div>
              ) : config.type === "visa" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="visaType">Visa Classification</label>
                  <Select value={visaType} onValueChange={(v) => { setVisaType(v || "Student (S-1)"); setIsDirty(true); }}>
                    <SelectTrigger id="visaType" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student (S-1)">Student (S-1)</SelectItem>
                      <SelectItem value="Student (S-2)">Student (S-2)</SelectItem>
                      <SelectItem value="Research (R-1)">Research (R-1)</SelectItem>
                      <SelectItem value="Intern (I-1)">Intern (I-1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="issueDate">New Issue Date *</label>
                <DatePicker 
                  id="issueDate" 
                  value={issueDate} 
                  onChange={(e) => { setIssueDate(e.target.value); setIsDirty(true); }} 
                  placeholder="Select issue date..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="expiryDate">New Expiration Date *</label>
                <DatePicker 
                  id="expiryDate" 
                  value={expiryDate} 
                  onChange={(e) => { setExpiryDate(e.target.value); setIsDirty(true); }} 
                  error={
                    issueDate && expiryDate && new Date(expiryDate) <= new Date(issueDate) 
                      ? "Expiry date must be after issue date" 
                      : undefined
                  }
                  placeholder="Select expiry date..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="pdfFile">Select Physical Document File *</label>
              <Input 
                id="pdfFile" 
                type="file" 
                accept=".pdf,image/jpeg,image/png,image/webp" 
                onChange={handleFileChange} 
                className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary file:hover:bg-primary/20" 
              />
              <p className="text-[10px] text-muted-foreground">Supported formats: PDF, JPEG, PNG, WEBP. Max file size: 5MB.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="notes">Renewal Notes / Remarks</label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }} 
                placeholder="e.g. Renewal grant from FRRO; newly issued passport from Consulate..." 
                className="min-h-16 text-xs" 
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
              <AsyncActionButton
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                isSuccess={uploadSuccess}
                isError={uploadError}
                idleText="Upload New Document"
                loadingText="Uploading..."
                successText="Uploaded"
                errorText="Try Again"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isConfirmDiscardOpen}
        title="Discard Document Changes?"
        description="You have unsaved changes in this document upload form. Are you sure you want to discard your input?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="destructive"
        onClose={() => setIsConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
      />
    </>
  );
}

interface CorrectMetadataDialogProps {
  config: DocumentConfig;
  studentId: string;
  initialValues: {
    documentNumber: string;
    issueDate: string;
    expiryDate: string;
    placeOfIssue?: string;
    visaType?: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Metadata Correction Modal (In-Place Error Fixing)
 */
export function CorrectMetadataDialog({ config, studentId, initialValues, isOpen, onOpenChange, onSuccess }: CorrectMetadataDialogProps): React.JSX.Element {
  const [docNumber, setDocNumber] = React.useState(initialValues.documentNumber || "");
  const [issueDate, setIssueDate] = React.useState(initialValues.issueDate || "");
  const [expiryDate, setExpiryDate] = React.useState(initialValues.expiryDate || "");
  const [placeOfIssue, setPlaceOfIssue] = React.useState(initialValues.placeOfIssue || "");
  const [visaType, setVisaType] = React.useState(initialValues.visaType || "Student (S-1)");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (isOpen) {
      setDocNumber(initialValues.documentNumber || "");
      setIssueDate(initialValues.issueDate ? initialValues.issueDate.split("T")[0] : "");
      setExpiryDate(initialValues.expiryDate ? initialValues.expiryDate.split("T")[0] : "");
      setPlaceOfIssue(initialValues.placeOfIssue || "");
      setVisaType(initialValues.visaType || "Student (S-1)");
      setReason("");
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!docNumber.trim()) newErrors.docNumber = "Document number is required.";
    if (!issueDate.trim()) newErrors.issueDate = "Issue date is required.";
    if (!expiryDate.trim()) newErrors.expiryDate = "Expiration date is required.";
    else if (issueDate.trim() && new Date(expiryDate.trim()) <= new Date(issueDate.trim())) {
      newErrors.expiryDate = "Expiration date must be strictly after the issue date.";
    }
    if (!reason.trim()) newErrors.reason = "A mandatory reason for correction is required for compliance audit logs.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Validation Error", { description: "Please resolve highlighted field errors." });
      return;
    }

    setIsSubmitting(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      const res = await correctDocumentMetadataAction({
        studentId,
        documentType: config.type,
        documentNumber: docNumber.trim(),
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim(),
        placeOfIssue: placeOfIssue.trim() || undefined,
        visaType: visaType.trim() || undefined,
        reason: reason.trim()
      });

      if (res.success) {
        setSaveSuccess(true);
        toast.success("Document Information Corrected", {
          description: "Active document record updated in-place with audit log traceability."
        });
        setTimeout(() => {
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }, 600);
      } else {
        setSaveError(true);
        toast.error("Correction Failed", { description: res.error || "Unable to save metadata correction." });
      }
    } catch (err) {
      setSaveError(true);
      toast.error("Error", { description: err instanceof Error ? err.message : "Failed to update record." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Correct {config.title} Information
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-1 text-xs">
          <div className="p-3 bg-muted/40 border border-border/70 rounded-lg text-muted-foreground text-xs leading-relaxed flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Metadata Correction Mode</span>
              Use this option only when the information recorded for the existing document is incorrect. This updates the current active record in-place and does not represent a newly issued document.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="correctDocNumber">{config.fieldLabel} *</label>
            <Input 
              id="correctDocNumber" 
              value={docNumber} 
              onChange={(e) => { setDocNumber(e.target.value); setErrors(prev => ({ ...prev, docNumber: "" })); }} 
              className="h-9 text-xs" 
            />
            {errors.docNumber && <p className="text-[10px] text-destructive font-medium">{errors.docNumber}</p>}
          </div>

          {config.type === "passport" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="correctPlaceOfIssue">Place of Issue</label>
              <Input 
                id="correctPlaceOfIssue" 
                value={placeOfIssue} 
                onChange={(e) => setPlaceOfIssue(e.target.value)} 
                className="h-9 text-xs" 
              />
            </div>
          ) : config.type === "visa" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="correctVisaType">Visa Classification</label>
              <Select value={visaType} onValueChange={(v) => setVisaType(v || "Student (S-1)")}>
                <SelectTrigger id="correctVisaType" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student (S-1)">Student (S-1)</SelectItem>
                  <SelectItem value="Student (S-2)">Student (S-2)</SelectItem>
                  <SelectItem value="Research (R-1)">Research (R-1)</SelectItem>
                  <SelectItem value="Intern (I-1)">Intern (I-1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="correctIssueDate">Issue Date *</label>
              <DatePicker 
                id="correctIssueDate" 
                value={issueDate} 
                onChange={(e) => { setIssueDate(e.target.value); setErrors(prev => ({ ...prev, issueDate: "", expiryDate: "" })); }} 
                error={errors.issueDate}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="correctExpiryDate">Expiration Date *</label>
              <DatePicker 
                id="correctExpiryDate" 
                value={expiryDate} 
                onChange={(e) => { setExpiryDate(e.target.value); setErrors(prev => ({ ...prev, expiryDate: "" })); }} 
                error={errors.expiryDate}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="correctionReason">Reason for Correction *</label>
            <Textarea 
              id="correctionReason" 
              value={reason} 
              onChange={(e) => { setReason(e.target.value); setErrors(prev => ({ ...prev, reason: "" })); }} 
              placeholder="e.g. Corrected typo in expiration year; updated place of issue from physical passport scan..." 
              className={`min-h-18 text-xs ${errors.reason ? "border-destructive" : ""}`} 
            />
            {errors.reason && <p className="text-[10px] text-destructive font-medium">{errors.reason}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <AsyncActionButton
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              isSuccess={saveSuccess}
              isError={saveError}
              idleText="Save Correction"
              loadingText="Saving..."
              successText="Corrected"
              errorText="Try Again"
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VerificationPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (data: { status: "verified" | "rejected"; reason: string }) => void;
}

export function VerificationPanel({ isOpen, onOpenChange, onVerify }: VerificationPanelProps): React.JSX.Element {
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState<"approve" | "reject" | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState(false);
  const [actionError, setActionError] = React.useState(false);

  const handleAction = async (status: "verified" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) {
      toast.error("Rejection Reason Required", { description: "Please explain the reason for document rejection." });
      return;
    }

    setIsSubmitting(status === "verified" ? "approve" : "reject");
    setActionSuccess(false);
    setActionError(false);

    try {
      onVerify({ status, reason: status === "rejected" ? rejectionReason : "" });
      setActionSuccess(true);
      setTimeout(() => {
        setRejectionReason("");
        onOpenChange(false);
      }, 600);
    } catch (err) {
      setActionError(true);
      toast.error("Action Failed", { description: err instanceof Error ? err.message : "Unable to process verification." });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Document Audit Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <p className="text-muted-foreground font-caption">
            Review the uploaded document file and verify all details. Approving will activate this new version and supersede previous versions.
          </p>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="rejectionReason">Rejection Remarks (Required if rejecting)</label>
            <Textarea 
              id="rejectionReason" 
              placeholder="Explain why this document was rejected (e.g. blurred text, wrong document type, expired details)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-16 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <AsyncActionButton
              variant="destructive"
              size="sm"
              onClick={() => handleAction("rejected")}
              isLoading={isSubmitting === "reject"}
              isSuccess={actionSuccess && isSubmitting === "reject"}
              isError={actionError && isSubmitting === "reject"}
              idleText="Reject Version"
              loadingText="Processing..."
              successText="Rejected"
              errorText="Try Again"
            />
            <AsyncActionButton
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => handleAction("verified")}
              isLoading={isSubmitting === "approve"}
              isSuccess={actionSuccess && isSubmitting === "approve"}
              isError={actionError && isSubmitting === "approve"}
              idleText="Verify & Approve"
              loadingText="Activating..."
              successText="Approved"
              errorText="Try Again"
            />
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}


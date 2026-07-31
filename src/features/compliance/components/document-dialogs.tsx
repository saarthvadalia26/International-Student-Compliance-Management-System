"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { toast } from "sonner";
import { DocumentConfig } from "../constants/constants";
import { DatePicker } from "@/components/ui/date-picker";

interface UploadDialogProps {
  config: DocumentConfig;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { docNumber: string; issueDate: string; expiryDate: string; file: File | null }) => void;
}

export function DocumentUploadDialog({ config, isOpen, onOpenChange, onSubmit }: UploadDialogProps): React.JSX.Element {
  const [docNumber, setDocNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [uploadError, setUploadError] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        toast.error("File Type Blocked", { description: "Only PDF documents are allowed." });
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        toast.error("File Size Exceeded", { description: "PDF file size must not exceed 2MB." });
        return;
      }
      setFile(selected);
      setIsDirty(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !issueDate || !expiryDate || !file) {
      toast.error("Required fields missing", { description: "Please populate all fields and select a PDF file." });
      return;
    }
    
    if (new Date(expiryDate) <= new Date(issueDate)) {
      toast.error("Validation Error", { description: "Expiry date must be after the issue date." });
      return;
    }

    setIsSubmitting(true);
    setUploadSuccess(false);
    setUploadError(false);

    setTimeout(() => {
      try {
        onSubmit({ docNumber, issueDate, expiryDate, file });
        setIsSubmitting(false);
        setUploadSuccess(true);
        
        setTimeout(() => {
          onOpenChange(false);
          // Reset form
          setDocNumber("");
          setIssueDate("");
          setExpiryDate("");
          setFile(null);
          setIsDirty(false);
        }, 800);

        toast.success("Profile updated successfully.");
      } catch (err) {
        setIsSubmitting(false);
        setUploadError(true);
        toast.error("Unable to save changes. Please try again.");
      }
    }, 800);
  };

  const handleClose = (open: boolean) => {
    if (!open && isDirty) {
      const confirmDiscard = window.confirm("You have unsaved changes. Discard file upload details?");
      if (!confirmDiscard) return;
    }
    onOpenChange(open);
    setIsDirty(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Upload {config.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="docNumber">{config.fieldLabel}</label>
            <Input id="docNumber" value={docNumber} onChange={(e) => { setDocNumber(e.target.value); setIsDirty(true); }} className="h-9 text-sm" placeholder="e.g. A-12345678" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="issueDate">Issue Date</label>
              <DatePicker 
                id="issueDate" 
                value={issueDate} 
                onChange={(e) => { setIssueDate(e.target.value); setIsDirty(true); }} 
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="expiryDate">Expiry Date</label>
              <DatePicker 
                id="expiryDate" 
                value={expiryDate} 
                onChange={(e) => { setExpiryDate(e.target.value); setIsDirty(true); }} 
                error={
                  issueDate && expiryDate && new Date(expiryDate) <= new Date(issueDate) 
                    ? "Expiry date must be after issue date" 
                    : undefined
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="pdfFile">Select PDF Document</label>
            <Input id="pdfFile" type="file" accept=".pdf" onChange={handleFileChange} className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary file:hover:bg-primary/20" />
            <p className="text-[10px] text-muted-foreground">PDF formats only. Max file size 2MB.</p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
            <AsyncActionButton
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              isSuccess={uploadSuccess}
              isError={uploadError}
              idleText="Submit Version"
              loadingText="Uploading..."
              successText="Changes saved"
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

    // Simulate saving latency
    setTimeout(() => {
      try {
        onVerify({ status, reason: status === "rejected" ? rejectionReason : "" });
        setActionSuccess(true);
        
        toast.success("Profile updated successfully.");
        
        setTimeout(() => {
          setRejectionReason("");
          onOpenChange(false);
        }, 800);
      } catch (err) {
        setActionError(true);
        toast.error("Unable to save changes. Please try again.");
      } finally {
        setIsSubmitting(null);
      }
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Document Audit Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <p className="text-muted-foreground font-caption">
            Review the uploaded PDF file. Inspect document identifier spelling, signature presence, and dates alignment.
          </p>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="rejectionReason">Rejection Remarks (Required if rejecting)</label>
            <Textarea 
              id="rejectionReason" 
              placeholder="Explain why this document was rejected (e.g. blurred text, wrong document type, expired details)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-16 text-sm"
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
              successText="Changes saved"
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
              loadingText="Processing..."
              successText="Changes saved"
              errorText="Try Again"
            />
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface RejectionDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Reusable ISCMS Rejection Modal Dialog
 * Replaces window.prompt() for document rejection remark inputs.
 */
export function RejectionDialog({
  open,
  title = "Reject Document Verification",
  description = "Please provide an explanation for rejecting this document. This note will be recorded in the student audit log.",
  placeholder = "Explain reason for rejection (e.g., blurred scan, incorrect document details, expired document)...",
  confirmText = "Reject Document",
  cancelText = "Cancel",
  onClose,
  onConfirm,
  isLoading = false,
}: RejectionDialogProps): React.JSX.Element {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a rejection remark before submitting.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-3 pt-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-sm font-semibold text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-caption leading-relaxed pt-0.5">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-2 py-3">
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder={placeholder}
              className="min-h-20 text-xs"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isLoading || !reason.trim()}
              className="text-xs"
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

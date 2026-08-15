"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Info, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default" | "info";
  icon?: "warning" | "destructive" | "info" | "help" | "none";
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Reusable ISCMS Confirmation Dialog
 * Replaces native browser window.confirm() with a themed, accessible modal.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onClose,
  title = "Unsaved Changes",
  description = "You have unsaved changes in this form. Are you sure you want to discard them?",
  confirmText = "Discard Changes",
  cancelText = "Keep Editing",
  variant = "warning",
  icon = "warning",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps): React.JSX.Element {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    } else if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const renderIcon = () => {
    if (icon === "none") return null;
    if (icon === "warning" || variant === "warning") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    }
    if (icon === "destructive" || variant === "destructive") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5" />
        </div>
      );
    }
    if (icon === "info") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Info className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <HelpCircle className="h-5 w-5" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="sm:max-w-md w-full">
        <div className="flex items-start gap-3.5 pt-1">
          {renderIcon()}
          <div className="space-y-1 flex-1">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-sm font-semibold text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-caption leading-relaxed pt-1">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="pt-3 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : variant === "warning" ? "destructive" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 text-white text-xs"
                : "text-xs"
            }
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

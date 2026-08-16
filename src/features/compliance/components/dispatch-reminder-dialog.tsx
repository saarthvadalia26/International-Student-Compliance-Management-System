"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  User, 
  Phone, 
  Calendar, 
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { getDocumentTheme } from "@/features/compliance/constants/constants";
import { 
  getReminderDispatchPreviewAction, 
  triggerReminderDispatchAction 
} from "@/app/(app)/students/actions";

interface DispatchReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  docType: "passport" | "visa" | "efrro";
  thresholdDays: number;
  ruleId: string;
  ruleName: string;
  onDispatched?: () => Promise<void> | void;
}

export function DispatchReminderDialog({
  isOpen,
  onClose,
  studentId,
  docType,
  thresholdDays,
  onDispatched
}: DispatchReminderDialogProps) {
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(true);
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof getReminderDispatchPreviewAction>>["preview"] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const docTheme = getDocumentTheme(docType);

  const loadPreview = React.useCallback(async () => {
    if (!isOpen || !studentId) return;
    try {
      setIsLoadingPreview(true);
      setLoadError(null);
      const res = await getReminderDispatchPreviewAction(studentId, docType, thresholdDays);
      if (res.success && res.preview) {
        setPreview(res.preview);
      } else {
        setLoadError(res.error || "Failed to load reminder dispatch details.");
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error loading reminder dispatch preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, studentId, docType, thresholdDays]);

  React.useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      setPreview(null);
      setLoadError(null);
      setIsDispatching(false);
    }
  }, [isOpen, loadPreview]);

  const handleExecuteDispatch = async () => {
    if (!preview || !preview.isDispatchable) return;
    try {
      setIsDispatching(true);
      const res = await triggerReminderDispatchAction(studentId, docType, thresholdDays);
      if (res.success && res.status === "DISPATCHED") {
        toast.success("Reminder Alert Dispatched", {
          description: `Successfully transmitted ${thresholdDays}-day reminder via WhatsApp to ${preview.studentName}.`
        });
        if (onDispatched) {
          await onDispatched();
        }
        onClose();
      } else if (res.status === "BLOCKED" && res.reason === "whatsapp_not_configured") {
        toast.warning("WhatsApp Not Configured", {
          description: res.error || "WhatsApp Business API credentials must be configured before dispatching."
        });
      } else if (res.status === "ALREADY_DISPATCHED") {
        toast.info("Already Dispatched", {
          description: res.error || "This reminder has already been dispatched."
        });
        if (onDispatched) {
          await onDispatched();
        }
        onClose();
      } else {
        toast.error("Dispatch Blocked or Failed", {
          description: res.error || "Unable to dispatch WhatsApp reminder notification."
        });
      }
    } catch (err) {
      toast.error("Dispatch Error", {
        description: err instanceof Error ? err.message : "An unexpected dispatch error occurred."
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDispatching) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 shadow-lg">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${docTheme.bannerClass}`}>
              <Send className={`h-4 w-4 ${docTheme.bannerIconClass}`} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Dispatch WhatsApp Reminder
              </DialogTitle>
              <DialogDescription className="text-[11px] font-caption text-muted-foreground">
                Review recipient and integration readiness before dispatch
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {isLoadingPreview ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Resolving reminder dispatch parameters...</span>
            </div>
          ) : loadError ? (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Unable to Load Reminder Details</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{loadError}</p>
            </div>
          ) : preview ? (
            <>
              {/* Target Student & Document Info Summary */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{preview.studentName}</span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${docTheme.badgeClass}`}>
                    {preview.documentTitle}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-caption">Expiry Date</span>
                    <span className="font-mono font-medium text-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {preview.expiryDateFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-caption">Timeline Milestone</span>
                    <span className="font-semibold text-foreground truncate block" title={preview.ruleName}>
                      {preview.ruleName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-caption">Recipient Mobile / WhatsApp</span>
                    <span className={`font-mono font-medium flex items-center gap-1 ${preview.hasValidPhone ? "text-foreground" : "text-destructive font-sans font-semibold"}`}>
                      <Phone className="h-3 w-3 shrink-0" />
                      {preview.studentPhone || "Not Provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-caption">WhatsApp Template</span>
                    <span className="font-mono text-muted-foreground truncate block text-[10px]" title={preview.templateCode}>
                      {preview.templateName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Alert Banner */}
              {preview.alreadyDispatched ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-semibold">Reminder Already Dispatched</p>
                    <p className="text-muted-foreground text-[10px]">
                      This {preview.thresholdDays}-day reminder was already transmitted for this document version.
                    </p>
                  </div>
                </div>
              ) : !preview.hasValidPhone ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-semibold">Student WhatsApp Number Missing</p>
                    <p className="text-muted-foreground text-[10px]">
                      Add a valid mobile number with country code in the student&apos;s profile before dispatching reminders.
                    </p>
                  </div>
                </div>
              ) : preview.integrationStatus === "NOT_CONFIGURED" ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900 dark:text-amber-100">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>WhatsApp Business API Not Configured</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-semibold">
                      Not Configured
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This reminder is ready for dispatch, but the WhatsApp Business API integration has not been configured in this environment yet. Set your Meta Cloud API credentials to enable live dispatch.
                  </p>
                </div>
              ) : preview.integrationStatus === "READY" ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp Business API is connected & ready for dispatch.</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold">
                    Ready
                  </Badge>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-3 border-t border-border/40 bg-muted/10 flex flex-row items-center justify-end gap-2">
          {preview?.integrationStatus === "NOT_CONFIGURED" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8 cursor-pointer"
              >
                Close
              </Button>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Configure WhatsApp
              </Link>
            </>
          ) : preview?.alreadyDispatched || !preview?.hasValidPhone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 cursor-pointer"
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isDispatching}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteDispatch}
                disabled={isDispatching || !preview?.isDispatchable}
                className="text-xs h-8 font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Send WhatsApp Reminder
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, GitCompare, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  onConfirmOverwrite: () => void;
  localDraft?: Record<string, unknown> | null;
  remoteRecord?: Record<string, unknown> | null;
  entityName?: string;
}

export function ConflictDialog({
  isOpen,
  onClose,
  onReload,
  onConfirmOverwrite,
  localDraft,
  remoteRecord,
  entityName = "Record",
}: ConflictDialogProps) {
  const [showDiff, setShowDiff] = React.useState(false);

  const getChangedKeys = React.useMemo(() => {
    if (!localDraft || !remoteRecord) return [];
    const keys = new Set([...Object.keys(localDraft), ...Object.keys(remoteRecord)]);
    const changed: Array<{ key: string; localVal: string; remoteVal: string }> = [];

    keys.forEach((key) => {
      // Ignore meta keys
      if (["created_at", "updated_at", "id", "student_id"].includes(key)) return;
      const lVal = JSON.stringify(localDraft[key] ?? "");
      const rVal = JSON.stringify(remoteRecord[key] ?? "");
      if (lVal !== rVal) {
        changed.push({ key, localVal: String(localDraft[key] ?? "N/A"), remoteVal: String(remoteRecord[key] ?? "N/A") });
      }
    });

    return changed;
  }, [localDraft, remoteRecord]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Concurrent Modification Detected</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-caption pt-1">
            Another staff member has updated this {entityName.toLowerCase()} in real time. Your uncommitted draft may overwrite their changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300">
            <AlertTitle className="text-xs font-semibold">Data Protection Rule</AlertTitle>
            <AlertDescription className="text-xs">
              To prevent accidental data overwrites, please choose how to resolve this conflict.
            </AlertDescription>
          </Alert>

          {showDiff && getChangedKeys.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2 max-h-[220px] overflow-y-auto">
              <p className="font-semibold text-foreground border-b pb-1">Conflicting Fields Comparison:</p>
              <div className="grid grid-cols-3 font-mono text-[11px] font-semibold text-muted-foreground pb-1">
                <span>Field</span>
                <span className="text-amber-600">Your Draft</span>
                <span className="text-emerald-600">Server Version</span>
              </div>
              {getChangedKeys.map(({ key, localVal, remoteVal }) => (
                <div key={key} className="grid grid-cols-3 gap-2 py-1 border-b border-border/30 text-[11px]">
                  <span className="font-medium text-foreground truncate">{key}</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono truncate">{localVal}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono truncate">{remoteVal}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDiff(!showDiff)}
            className="text-xs"
          >
            <GitCompare className="h-3.5 w-3.5 mr-1" />
            {showDiff ? "Hide Differences" : "Compare Changes"}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onReload}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reload Latest Version
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onConfirmOverwrite}
            className="text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Overwrite Server Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

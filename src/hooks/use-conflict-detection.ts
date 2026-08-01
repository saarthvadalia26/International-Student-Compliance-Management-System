"use client";

import * as React from "react";
import { useRealtimeSubscription } from "./use-realtime-subscription";

interface UseConflictDetectionOptions {
  table: string;
  recordId: string | null | undefined;
  initialUpdatedAt?: string | null;
}

export interface ConflictState {
  hasConflict: boolean;
  localDraft: Record<string, unknown> | null;
  remoteRecord: Record<string, unknown> | null;
}

export function useConflictDetection({
  table,
  recordId,
  initialUpdatedAt,
}: UseConflictDetectionOptions) {
  const [conflict, setConflict] = React.useState<ConflictState>({
    hasConflict: false,
    localDraft: null,
    remoteRecord: null,
  });

  const baseTimestampRef = React.useRef<string | null>(initialUpdatedAt || null);

  React.useEffect(() => {
    if (initialUpdatedAt) {
      baseTimestampRef.current = initialUpdatedAt;
    }
  }, [initialUpdatedAt]);

  useRealtimeSubscription({
    table,
    enabled: Boolean(recordId),
    onEvent: (evt) => {
      if (evt.eventType !== "UPDATE" || !evt.newRecord) return;
      
      const payloadId = String(evt.newRecord.id || evt.newRecord.student_id || "");
      if (payloadId !== String(recordId)) return;

      const remoteUpdatedAt = String(evt.newRecord.updated_at || evt.timestamp);
      
      // If remote record was updated after our initial load, trigger conflict alert
      if (baseTimestampRef.current && remoteUpdatedAt > baseTimestampRef.current) {
        console.warn(`[CONFLICT_DETECTED] Record ${recordId} in table ${table} was modified concurrently.`);
        setConflict((prev) => ({
          hasConflict: true,
          localDraft: prev.localDraft,
          remoteRecord: evt.newRecord!,
        }));
      }
    },
  });

  const registerLocalDraft = React.useCallback((draft: Record<string, unknown>) => {
    setConflict((prev) => ({ ...prev, localDraft: draft }));
  }, []);

  const dismissConflict = React.useCallback(() => {
    setConflict({
      hasConflict: false,
      localDraft: null,
      remoteRecord: null,
    });
  }, []);

  const updateBaseTimestamp = React.useCallback((newTimestamp: string) => {
    baseTimestampRef.current = newTimestamp;
    dismissConflict();
  }, [dismissConflict]);

  return {
    hasConflict: conflict.hasConflict,
    remoteRecord: conflict.remoteRecord,
    localDraft: conflict.localDraft,
    registerLocalDraft,
    dismissConflict,
    updateBaseTimestamp,
  };
}

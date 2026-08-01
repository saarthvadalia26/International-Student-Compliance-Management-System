"use client";

import * as React from "react";
import { useRealtime, RealtimeEventPayload } from "@/providers/realtime-provider";

interface UseRealtimeSubscriptionOptions {
  table: string;
  onEvent: (payload: RealtimeEventPayload) => void;
  enabled?: boolean;
}

/**
 * Custom hook to subscribe to table-level or entity-level Realtime events.
 * Automatically unsubscribes when the component unmounts or options change.
 */
export function useRealtimeSubscription({
  table,
  onEvent,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const { subscribe, status } = useRealtime();
  const callbackRef = React.useRef(onEvent);

  // Keep latest callback ref to prevent unnecessary re-subscribes
  React.useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  React.useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe(table, (payload) => {
      if (callbackRef.current) {
        callbackRef.current(payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [table, enabled, subscribe]);

  return { isConnected: status === "connected" };
}

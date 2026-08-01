"use client";

import * as React from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export interface RealtimeEventPayload {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
  newRecord?: Record<string, unknown>;
  oldRecord?: Record<string, unknown>;
  timestamp: string;
}

export type TableEventCallback = (payload: RealtimeEventPayload) => void;

interface RealtimeContextType {
  status: ConnectionStatus;
  lastSyncedAt: Date | null;
  subscribe: (table: string, callback: TableEventCallback) => () => void;
  reconnect: () => void;
}

const RealtimeContext = React.createContext<RealtimeContextType>({
  status: "connecting",
  lastSyncedAt: null,
  subscribe: () => () => {},
  reconnect: () => {},
});

export function useRealtime() {
  return React.useContext(RealtimeContext);
}

const MONITORED_TABLES = [
  "students",
  "student_personal",
  "student_academic",
  "student_contact",
  "student_snapshot",
  "passport_versions",
  "visa_versions",
  "efrro_versions",
  "notifications",
  "audit_log",
  "reference_data",
];

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  
  const listenersRef = React.useRef<Map<string, Set<TableEventCallback>>>(new Map());
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingEventsRef = React.useRef<RealtimeEventPayload[]>([]);

  // Log connection lifecycle audit events silently
  const logConnectionAudit = React.useCallback((action: string, details?: string) => {
    console.log(`[REALTIME_AUDIT] ${action}${details ? `: ${details}` : ""}`);
  }, []);

  const dispatchBufferedEvents = React.useCallback(() => {
    const events = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    events.forEach((evt) => {
      const callbacks = listenersRef.current.get(evt.table);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(evt);
          } catch (err) {
            console.error(`[REALTIME_SYNC_ERROR] Error in listener for ${evt.table}:`, err);
            logConnectionAudit("Synchronization failure", String(err));
          }
        });
      }
      
      // Also notify wildcard "*" table listeners
      const globalCallbacks = listenersRef.current.get("*");
      if (globalCallbacks) {
        globalCallbacks.forEach((cb) => {
          try {
            cb(evt);
          } catch (err) {
            console.error(`[REALTIME_SYNC_ERROR] Error in global listener:`, err);
          }
        });
      }
    });

    if (events.length > 0) {
      setLastSyncedAt(new Date());
    }
  }, [logConnectionAudit]);

  const handleIncomingPayload = React.useCallback(
    (table: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const evt: RealtimeEventPayload = {
        table,
        eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
        newRecord: payload.new && Object.keys(payload.new).length > 0 ? (payload.new as Record<string, unknown>) : undefined,
        oldRecord: payload.old && Object.keys(payload.old).length > 0 ? (payload.old as Record<string, unknown>) : undefined,
        timestamp: new Date().toISOString(),
      };

      pendingEventsRef.current.push(evt);

      // Debounce UI notification dispatch by 200ms to batch rapid mutations
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        dispatchBufferedEvents();
      }, 200);
    },
    [dispatchBufferedEvents]
  );

  const initRealtimeChannel = React.useCallback(() => {
    try {
      const supabase = getBrowserSupabase();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      let channel = supabase.channel("iscms_global_realtime_sync");

      MONITORED_TABLES.forEach((tbl) => {
        channel = channel.on(
          "postgres_changes" as const,
          { event: "*", schema: "public", table: tbl },
          (payload) => handleIncomingPayload(tbl, payload as RealtimePostgresChangesPayload<Record<string, unknown>>)
        );
      });

      channel.subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setStatus("connected");
          setLastSyncedAt(new Date());
          logConnectionAudit("Connection established", "Subscribed to global realtime channel");
        } else if (subStatus === "CLOSED") {
          setStatus("offline");
          logConnectionAudit("Connection lost", "Realtime channel closed");
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setStatus("reconnecting");
          logConnectionAudit("Connection error / Reconnecting", subStatus);
        }
      });

      channelRef.current = channel;
    } catch (err) {
      console.error("[REALTIME_INIT_ERROR] Failed to initialize Realtime channel:", err);
      setTimeout(() => setStatus("offline"), 0);
      logConnectionAudit("Synchronization failure", String(err));
    }
  }, [handleIncomingPayload, logConnectionAudit]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      initRealtimeChannel();
    }, 0);

    // Auto-reconnect handling on window focus / online event
    const handleOnline = () => {
      logConnectionAudit("Network online detected, reconnecting realtime...");
      initRealtimeChannel();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channelRef.current) {
        getBrowserSupabase().removeChannel(channelRef.current);
      }
    };
  }, [initRealtimeChannel, logConnectionAudit]);

  const subscribe = React.useCallback((table: string, callback: TableEventCallback) => {
    if (!listenersRef.current.has(table)) {
      listenersRef.current.set(table, new Set());
    }
    listenersRef.current.get(table)!.add(callback);

    // Unsubscribe callback
    return () => {
      const set = listenersRef.current.get(table);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(table);
        }
      }
    };
  }, []);

  const value = React.useMemo(
    () => ({
      status,
      lastSyncedAt,
      subscribe,
      reconnect: initRealtimeChannel,
    }),
    [status, lastSyncedAt, subscribe, initRealtimeChannel]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

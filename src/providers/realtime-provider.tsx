"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  /** Broadcasts a session logout event to all connected browser tabs */
  broadcastSessionLogout: (type: "global_signout" | "emergency_logout") => void;
}

const RealtimeContext = React.createContext<RealtimeContextType>({
  status: "connecting",
  lastSyncedAt: null,
  subscribe: () => () => {},
  reconnect: () => {},
  broadcastSessionLogout: () => {},
});

export function useRealtime() {
  return React.useContext(RealtimeContext);
}

const MONITORED_TABLES = [
  "reference_data",
  "academic_programs",
  "system_config",
  "students",
  "student_personal",
  "student_contact",
  "student_academic",
  "student_relationships",
  "student_embassy",
  "passport_versions",
  "visa_versions",
  "efrro_versions",
  "student_snapshot",
  "notification_templates",
  "student_notification_preferences",
  "notifications",
  "notification_delivery_log",
  "in_app_notifications",
  "reminder_rules",
  "scheduled_jobs",
  "audit_log",
  "student_contact_audit",
  "upload_audit_log",
  "document_lifecycle_audit_log",
  "student_activity_log"
];

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  
  const listenersRef = React.useRef<Map<string, Set<TableEventCallback>>>(new Map());
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const sessionControlChannelRef = React.useRef<RealtimeChannel | null>(null);
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

  const initRealtimeChannel = React.useCallback(async () => {
    try {
      const supabase = getBrowserSupabase();
      
      // Ensure current user's session JWT is configured for Realtime authorization
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
      } catch (authErr) {
        console.warn("[REALTIME_AUTH_WARN] Could not retrieve session for realtime auth:", authErr);
      }

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
          // NOTE: Do NOT set lastSyncedAt on subscription handshake.
          // Last sync strictly represents the last time a relevant database mutation was received and processed.
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

  // ── Session Control Broadcast Channel ───────────────────────────────────────
  // Listens for emergency_logout and global_signout broadcast events.
  // On receipt, immediately signs out and redirects every connected tab.
  const initSessionControlChannel = React.useCallback(() => {
    const supabase = getBrowserSupabase();
    if (sessionControlChannelRef.current) {
      supabase.removeChannel(sessionControlChannelRef.current);
    }

    const ch = supabase
      .channel("iscms_session_control")
      .on("broadcast", { event: "emergency_logout" }, async () => {
        logConnectionAudit("Received emergency_logout broadcast — signing out all sessions");
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch { /* best-effort */ }
        // Clear any cached client state
        if (typeof window !== "undefined") {
          sessionStorage.clear();
          Object.keys(localStorage)
            .filter(k => k.startsWith("isms_") || k.startsWith("sb-"))
            .forEach(k => localStorage.removeItem(k));
        }
        router.push("/login");
      })
      .on("broadcast", { event: "global_signout" }, async () => {
        logConnectionAudit("Received global_signout broadcast — redirecting");
        router.push("/login");
      })
      .subscribe();

    sessionControlChannelRef.current = ch;
  }, [logConnectionAudit, router]);

  const broadcastSessionLogout = React.useCallback(
    (type: "global_signout" | "emergency_logout") => {
      const supabase = getBrowserSupabase();
      supabase.channel("iscms_session_control").send({
        type: "broadcast",
        event: type,
        payload: { timestamp: new Date().toISOString() },
      });
    },
    []
  );

  React.useEffect(() => {
    const supabase = getBrowserSupabase();

    const timer = setTimeout(() => {
      initRealtimeChannel();
      initSessionControlChannel();
    }, 0);

    // Dynamic Auth Token Synchronization
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.access_token) {
          try {
            await supabase.realtime.setAuth(session.access_token);
          } catch { /* best-effort */ }
        }
      }
    );

    // Auto-reconnect handling on window focus / online event
    const handleOnline = () => {
      logConnectionAudit("Network online detected, reconnecting realtime...");
      initRealtimeChannel();
      initSessionControlChannel();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      authSubscription?.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (sessionControlChannelRef.current) {
        supabase.removeChannel(sessionControlChannelRef.current);
      }
    };
  }, [initRealtimeChannel, initSessionControlChannel, logConnectionAudit]);

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
      broadcastSessionLogout,
    }),
    [status, lastSyncedAt, subscribe, initRealtimeChannel, broadcastSessionLogout]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

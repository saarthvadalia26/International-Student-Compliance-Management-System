"use client";

import * as React from "react";
import { useRealtime } from "@/providers/realtime-provider";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RealtimeIndicator() {
  const { status, lastSyncedAt, reconnect } = useRealtime();

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return {
          label: "Connected",
          titleStatus: "Connected",
          color: "bg-emerald-500",
          text: "text-emerald-700 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          icon: <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
          description: "All database mutations stream live without reloading.",
        };
      case "reconnecting":
        return {
          label: "Reconnecting...",
          titleStatus: "Reconnecting...",
          color: "bg-amber-500 animate-pulse",
          text: "text-amber-700 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/20",
          icon: <RefreshCw className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400" />,
          description: "Attempting automatic reconnection to WebSocket server...",
        };
      case "offline":
      case "connecting":
      default:
        return {
          label: status === "connecting" ? "Connecting..." : "Disconnected",
          titleStatus: status === "connecting" ? "Connecting..." : "Disconnected",
          color: status === "connecting" ? "bg-amber-500" : "bg-rose-500",
          text: status === "connecting" ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400",
          bg: status === "connecting" ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20",
          icon: status === "connecting" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <WifiOff className="h-3 w-3 text-rose-600 dark:text-rose-400" />,
          description: status === "connecting"
            ? "Connecting to Supabase Realtime channel..."
            : "Realtime WebSocket disconnected. Click indicator to reconnect.",
        };
    }
  };

  const current = getStatusBadge();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={status === "offline" ? reconnect : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${current.bg} ${current.text} focus:outline-none`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${current.color}`} />
          {current.icon}
          <span className="hidden sm:inline font-mono text-[10px] tracking-tight">{current.label}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-foreground">Supabase Realtime</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {current.titleStatus}
            </span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            {current.description}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground border-t pt-1">
            {lastSyncedAt
              ? `Last sync: ${lastSyncedAt.toLocaleTimeString()}`
              : "Last sync: Standing by for database mutations"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

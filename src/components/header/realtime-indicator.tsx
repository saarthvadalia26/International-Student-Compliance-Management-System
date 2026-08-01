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
          label: "Live Sync Active",
          color: "bg-emerald-500",
          text: "text-emerald-700 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          icon: <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
        };
      case "reconnecting":
        return {
          label: "Reconnecting...",
          color: "bg-amber-500 animate-pulse",
          text: "text-amber-700 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/20",
          icon: <RefreshCw className="h-3 w-3 animate-spin text-amber-600 dark:text-amber-400" />,
        };
      case "offline":
      case "connecting":
      default:
        return {
          label: status === "connecting" ? "Connecting..." : "Offline (Click to retry)",
          color: "bg-rose-500",
          text: "text-rose-700 dark:text-rose-400",
          bg: "bg-rose-500/10 border-rose-500/20",
          icon: <WifiOff className="h-3 w-3 text-rose-600 dark:text-rose-400" />,
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
          <p className="font-semibold">Supabase Realtime Status</p>
          <p className="text-muted-foreground text-[11px]">
            {status === "connected"
              ? "All database mutations stream live without reloading."
              : status === "reconnecting"
              ? "Attempting automatic reconnection to WebSocket server..."
              : "Realtime WebSocket disconnected. Click indicator to reconnect."}
          </p>
          {lastSyncedAt && (
            <p className="text-[10px] font-mono text-muted-foreground border-t pt-1">
              Last sync: {lastSyncedAt.toLocaleTimeString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

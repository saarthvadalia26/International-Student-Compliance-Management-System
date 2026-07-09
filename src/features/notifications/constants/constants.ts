import { CheckCircle2, Clock, Ban, AlertCircle } from "lucide-react";
import * as React from "react";

export type DeliveryStatus = "queued" | "sending" | "sent" | "failed" | "cancelled";

export interface StatusConfig {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIGS: Record<DeliveryStatus, StatusConfig> = {
  queued: {
    label: "Queued",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
    icon: Clock
  },
  sending: {
    label: "Sending",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/20",
    icon: Clock
  },
  sent: {
    label: "Sent",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: CheckCircle2
  },
  failed: {
    label: "Failed",
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: AlertCircle
  },
  cancelled: {
    label: "Cancelled",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/10",
    borderClass: "border-border/60",
    icon: Ban
  }
};

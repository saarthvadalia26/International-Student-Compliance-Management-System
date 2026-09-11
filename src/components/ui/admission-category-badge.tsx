import * as React from "react";
import { cn } from "@/lib/utils";

export interface AdmissionCategoryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  category?: string | null;
  categoryOther?: string | null;
  showFullName?: boolean;
  size?: "xs" | "sm" | "md";
}

export function getAdmissionCategoryConfig(category?: string | null, categoryOther?: string | null) {
  const norm = (category || "").trim().toLowerCase();
  if (!norm) return null;

  switch (norm) {
    case "iccr":
      return {
        code: "ICCR",
        label: "ICCR",
        fullLabel: "ICCR (Indian Council for Cultural Relations)",
        className: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25 dark:border-blue-400/30 hover:bg-blue-500/18",
        dotColor: "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]",
      };
    case "sii":
      return {
        code: "SII",
        label: "SII",
        fullLabel: "Study in India (SII)",
        className: "bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-400/30 hover:bg-purple-500/18",
        dotColor: "bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.6)]",
      };
    case "direct":
      return {
        code: "DIRECT",
        label: "Direct",
        fullLabel: "Direct Admission",
        className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-400/30 hover:bg-emerald-500/18",
        dotColor: "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]",
      };
    case "foreign_govt_sponsored":
    case "foreign_govt":
    case "govt_sponsored":
      return {
        code: "GOVT_SPONSORED",
        label: "Govt. Sponsored",
        fullLabel: "Foreign Govt. Sponsored",
        className: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25 dark:border-amber-400/30 hover:bg-amber-500/18",
        dotColor: "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.6)]",
      };
    case "other":
      return {
        code: "OTHER",
        label: categoryOther?.trim() ? `Other: ${categoryOther.trim()}` : "Other",
        fullLabel: categoryOther?.trim() ? `Other (${categoryOther.trim()})` : "Other Admission Track",
        className: "bg-slate-500/12 text-slate-700 dark:text-slate-200 border-slate-500/25 dark:border-slate-400/30 hover:bg-slate-500/18",
        dotColor: "bg-slate-400 dark:bg-slate-300 shadow-[0_0_5px_rgba(148,163,184,0.5)]",
      };
    default: {
      const formatted = norm.length <= 4 
        ? norm.toUpperCase() 
        : norm.charAt(0).toUpperCase() + norm.slice(1).replace(/_/g, " ");
      return {
        code: norm.toUpperCase(),
        label: formatted,
        fullLabel: formatted,
        className: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary-foreground/90 hover:bg-primary/15",
        dotColor: "bg-primary shadow-[0_0_5px_rgba(var(--primary),0.5)]",
      };
    }
  }
}

export function AdmissionCategoryBadge({
  category,
  categoryOther,
  showFullName = false,
  size = "sm",
  className,
  ...props
}: AdmissionCategoryBadgeProps) {
  const config = getAdmissionCategoryConfig(category, categoryOther);
  if (!config) return null;

  const sizeClasses = {
    xs: "text-[10px] px-2 py-0.5 gap-1.5 leading-none",
    sm: "text-[11px] px-2.5 py-0.5 gap-1.5 leading-none",
    md: "text-xs px-3 py-1 gap-2 leading-none",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-wide rounded-full border transition-all select-none shadow-xs max-w-full min-w-0 overflow-hidden",
        config.className,
        sizeClasses[size],
        className
      )}
      title={config.fullLabel}
      {...props}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotColor)} />
      <span className="truncate min-w-0">{showFullName ? config.fullLabel : config.label}</span>
    </span>
  );
}

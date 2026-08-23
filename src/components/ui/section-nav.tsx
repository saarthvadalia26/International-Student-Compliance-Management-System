"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionNavGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "responsive" | "vertical" | "horizontal";
  variant?: "default" | "segmented" | "pills";
}

export function SectionNavGroup({
  orientation = "responsive",
  variant = "default",
  className,
  children,
  ...props
}: SectionNavGroupProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "min-w-0 w-full box-border",
        // Orientation styles
        orientation === "responsive" &&
          "flex flex-row md:flex-col overflow-x-auto pb-1.5 md:pb-0 gap-1.5 md:gap-1.5 scrollbar-none snap-x",
        orientation === "vertical" && "flex flex-col gap-1.5",
        orientation === "horizontal" &&
          "flex flex-row overflow-x-auto pb-1 gap-1.5 scrollbar-none snap-x",
        // Variant styling container
        variant === "segmented" &&
          "p-1 bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-xl",
        variant === "pills" && "gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SectionNavCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  nativeTitle?: string;
  description?: React.ReactNode;
  isActive?: boolean;
  badgeCount?: number;
  badgeVariant?: "default" | "destructive" | "warning" | "success";
  badgeLabel?: string;
  variant?: "default" | "segmented" | "subtab";
  size?: "default" | "sm" | "compact";
}

export const SectionNavCard = React.forwardRef<
  HTMLButtonElement,
  SectionNavCardProps
>(
  (
    {
      icon: Icon,
      title,
      nativeTitle,
      description,
      isActive = false,
      badgeCount,
      badgeVariant = "destructive",
      badgeLabel,
      variant = "default",
      size = "default",
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        title={nativeTitle || (typeof title === "string" ? title : undefined)}
        className={cn(
          // Base button structure
          "group relative flex items-center justify-between text-left transition-all duration-150 ease-out select-none cursor-pointer outline-hidden min-w-0 shrink-0 active:scale-[0.99] active:duration-75",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

          // Size configurations
          size === "default" &&
            "px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-lg text-xs min-h-[42px]",
          size === "sm" &&
            "px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg text-xs min-h-[38px]",
          size === "compact" &&
            "px-2 py-1.5 rounded-md text-[11px] min-h-[34px]",

          // Responsive sizing in horizontal flow (mobile) vs vertical flow (desktop)
          "flex-1 md:flex-none md:w-full",

          // Default Section Card Variant
          variant === "default" && [
            "border",
            isActive
              ? "bg-card text-foreground font-semibold border-primary/50 shadow-xs ring-1 ring-primary/30 dark:bg-muted/40 dark:border-primary/60 dark:ring-primary/40"
              : "bg-muted/15 text-muted-foreground hover:bg-muted/40 hover:text-foreground border-border/50 hover:border-border/80 font-medium",
          ],

          // Segmented Tab Variant (inside segmented pill bars)
          variant === "segmented" && [
            "border border-transparent",
            isActive
              ? "bg-background text-foreground font-semibold shadow-xs border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium",
          ],

          // Sub-Tab Underline / Compact Variant
          variant === "subtab" && [
            "border-b-2 rounded-none bg-transparent pb-2 px-3 pt-1.5",
            isActive
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border font-medium",
          ],

          className
        )}
        {...props}
      >
        {/* Content Container (Top/Leading Aligned Icon & Title) */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {Icon && (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 mt-0.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          )}
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "leading-snug break-words",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {title}
            </div>
            {description && (
              <p className="text-[10px] text-muted-foreground font-normal leading-tight mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Trailing Badges / Error Counts */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 leading-none",
              badgeVariant === "destructive" &&
                "bg-rose-500 text-white shadow-xs animate-pulse",
              badgeVariant === "warning" &&
                "bg-amber-500 text-white shadow-xs",
              badgeVariant === "success" &&
                "bg-emerald-500 text-white shadow-xs",
              badgeVariant === "default" &&
                "bg-primary/15 text-primary border border-primary/20"
            )}
          >
            {badgeCount}
          </span>
        )}

        {badgeLabel && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 ml-2 bg-muted text-muted-foreground border border-border/60">
            {badgeLabel}
          </span>
        )}
      </button>
    );
  }
);

SectionNavCard.displayName = "SectionNavCard";

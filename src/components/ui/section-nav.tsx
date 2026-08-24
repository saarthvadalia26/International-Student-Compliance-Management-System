"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionNavContextValue {
  orientation: "responsive" | "vertical" | "horizontal";
  variant: "default" | "segmented" | "pills";
}

const SectionNavContext = React.createContext<SectionNavContextValue>({
  orientation: "responsive",
  variant: "default",
});

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
    <SectionNavContext.Provider value={{ orientation, variant }}>
      <div
        role="tablist"
        className={cn(
          "min-w-0 box-border",
          // Orientation styles
          orientation === "responsive" &&
            "flex flex-row md:flex-col overflow-x-auto pb-1.5 md:pb-0 gap-1.5 md:gap-1.5 scrollbar-none snap-x w-full",
          orientation === "vertical" && "flex flex-col gap-1.5 w-full",
          orientation === "horizontal" &&
            "flex flex-row flex-wrap items-center gap-1.5 w-full",
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
    </SectionNavContext.Provider>
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
      variant: explicitVariant,
      size = "default",
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    const context = React.useContext(SectionNavContext);
    const variant = explicitVariant || context.variant || "default";
    const orientation = context.orientation || "responsive";

    const isSegmented = variant === "segmented";
    const isSubtab = variant === "subtab";
    const isDefault = variant === "default";

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
          "group relative flex items-center justify-between text-left transition-all duration-150 ease-out select-none cursor-pointer outline-hidden active:scale-[0.99] active:duration-75",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

          // Size configurations
          size === "default" &&
            (isSegmented
              ? "px-3 py-2 rounded-lg text-xs min-h-[36px]"
              : "px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-lg text-xs min-h-[42px]"),
          size === "sm" &&
            (isSegmented
              ? "px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs min-h-[32px]"
              : "px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg text-xs min-h-[38px]"),
          size === "compact" &&
            "px-2 py-1 rounded-md text-[11px] min-h-[28px]",

          // Responsive width & layout behavior depending on variant and orientation
          isSegmented && "shrink-0 w-auto justify-center text-center",
          isSubtab && "shrink-0 w-auto justify-center text-center",
          isDefault && orientation === "responsive" && "flex-1 min-w-[180px] md:min-w-0 md:w-full md:flex-none shrink-0",
          isDefault && orientation === "vertical" && "w-full shrink-0",
          isDefault && orientation === "horizontal" && "shrink-0 w-auto",

          // Default Section Card Variant
          isDefault && [
            "border",
            isActive
              ? "bg-card text-foreground font-semibold border-primary/50 shadow-xs ring-1 ring-primary/30 dark:bg-muted/40 dark:border-primary/60 dark:ring-primary/40"
              : "bg-muted/15 text-muted-foreground hover:bg-muted/40 hover:text-foreground border-border/50 hover:border-border/80 font-medium",
          ],

          // Segmented Tab Variant (inside segmented pill bars)
          isSegmented && [
            "border",
            isActive
              ? "bg-background text-foreground font-semibold shadow-xs border-border/60 dark:bg-background/90"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium",
          ],

          // Sub-Tab Underline / Compact Variant
          isSubtab && [
            "border-b-2 rounded-none bg-transparent pb-2 px-3 pt-1.5",
            isActive
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border font-medium",
          ],

          className
        )}
        {...props}
      >
        {/* Content Container (Aligned Icon & Title) */}
        <div className={cn(
          "flex items-center gap-2 min-w-0",
          isSegmented ? "justify-center" : "flex-1 items-start gap-2.5"
        )}>
          {Icon && (
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-colors",
                !isSegmented && "mt-0.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          )}
          <div className="min-w-0">
            <div
              className={cn(
                "leading-snug whitespace-nowrap",
                isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground font-medium"
              )}
            >
              {title}
            </div>
            {description && !isSegmented && (
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

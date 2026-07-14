"use client";

import * as React from "react";
import { Loader2, Check, AlertTriangle, LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "./button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface AsyncActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  idleText?: React.ReactNode;
  loadingText?: React.ReactNode;
  successText?: React.ReactNode;
  errorText?: React.ReactNode;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  icon?: LucideIcon;
}

export const AsyncActionButton = React.forwardRef<HTMLButtonElement, AsyncActionButtonProps>(
  (
    {
      idleText = "Submit",
      loadingText = "Processing...",
      successText = "Completed",
      errorText = "Failed",
      isLoading = false,
      isSuccess = false,
      isError = false,
      icon: Icon,
      className,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [displayState, setDisplayState] = React.useState<"idle" | "loading" | "success" | "error">("idle");

    React.useEffect(() => {
      if (isLoading) {
        setDisplayState("loading");
      } else if (isSuccess) {
        setDisplayState("success");
        const timer = setTimeout(() => {
          setDisplayState("idle");
        }, 2000);
        return () => clearTimeout(timer);
      } else if (isError) {
        setDisplayState("error");
        const timer = setTimeout(() => {
          setDisplayState("idle");
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        setDisplayState("idle");
      }
    }, [isLoading, isSuccess, isError]);

    // Compute interactive state behaviors
    const isPending = displayState === "loading" || displayState === "success" || displayState === "error";
    const isDisabled = disabled || isPending;

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        onClick={onClick}
        aria-busy={displayState === "loading"}
        aria-live="polite"
        aria-disabled={isDisabled}
        className={cn(
          "transition-all duration-200 pointer-events-auto",
          displayState === "success" && "bg-emerald-600 text-white hover:bg-emerald-600 focus:ring-emerald-500",
          displayState === "error" && "bg-rose-600 text-white hover:bg-rose-600 focus:ring-rose-500",
          isPending && "pointer-events-none select-none",
          className
        )}
        style={{
          // Extra assurance that pointer clicks are completely disabled during action execution
          pointerEvents: isPending ? "none" : undefined
        }}
        {...props}
      >
        <span className="flex items-center justify-center gap-1.5">
          {/* 1. Loading Spinner */}
          {displayState === "loading" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          )}

          {/* 2. Success Icon */}
          {displayState === "success" && (
            <Check className="h-3.5 w-3.5 shrink-0 scale-110 transition-transform duration-200" />
          )}

          {/* 3. Error Icon */}
          {displayState === "error" && (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
          )}

          {/* 4. Idle Icon */}
          {displayState === "idle" && Icon && (
            <Icon className="h-3.5 w-3.5 shrink-0" />
          )}

          {/* Text Labels Content */}
          <span className="truncate">
            {displayState === "loading" && loadingText}
            {displayState === "success" && successText}
            {displayState === "error" && errorText}
            {displayState === "idle" && idleText}
          </span>
        </span>
      </Button>
    );
  }
);

AsyncActionButton.displayName = "AsyncActionButton";

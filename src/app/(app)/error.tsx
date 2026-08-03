"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { sanitizeError } from "@/lib/errors/error-sanitizer";

export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    sanitizeError(error, { route: "app-shell-error-boundary" });
  }, [error]);

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 shadow-lg backdrop-blur-md text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
          <AlertTriangle className="h-7 w-7 shrink-0" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We couldn&apos;t complete your request.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </button>
          <a
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/80 transition-colors"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

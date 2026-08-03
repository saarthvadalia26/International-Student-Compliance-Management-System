"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard, Terminal, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { sanitizeError } from "@/lib/errors/error-sanitizer";
import { useUserRole } from "@/hooks/use-user-role";

export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { isAdministrator } = useUserRole();
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  const sanitized = React.useMemo(() => {
    return sanitizeError(error, { route: "app-shell-error-boundary" });
  }, [error]);

  return (
    <div className="min-h-[65vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card/90 p-8 shadow-lg backdrop-blur-md text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
          <AlertTriangle className="h-7 w-7 shrink-0" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {sanitized.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {sanitized.message}
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

        {/* Administrator Diagnostic Mode Section */}
        {isAdministrator && (
          <div className="pt-4 border-t border-border/60 text-left">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted/80 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                <span>Administrator Diagnostic Mode</span>
              </span>
              {showDiagnostics ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>

            {showDiagnostics && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider border-b border-amber-500/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5" /> Diagnostic Summary
                  </span>
                  <span>{sanitized.diagnostics.category}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Log Reference ID</span>
                    <span className="font-bold text-foreground">{sanitized.diagnostics.logReferenceId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Response Status</span>
                    <span className="font-bold text-foreground">HTTP {sanitized.diagnostics.statusCode}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">Timestamp</span>
                    <span className="text-foreground">{sanitized.diagnostics.timestamp}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">Route Path</span>
                    <span className="text-foreground truncate block">{sanitized.diagnostics.route}</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-muted-foreground leading-normal border-t border-amber-500/15 italic">
                  Note: Sensitive tokens, database credentials, and raw SQL traces are securely withheld from client rendering. Full diagnostic traces are logged on the server under reference ID <span className="font-semibold text-foreground">{sanitized.diagnostics.logReferenceId}</span>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

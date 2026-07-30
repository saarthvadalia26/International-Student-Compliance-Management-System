"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface TurnstileStubProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function TurnstileStub({ onVerify, onError }: TurnstileStubProps) {
  const [status, setStatus] = React.useState<"verifying" | "success" | "error">("verifying");
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    let loadingTimer: NodeJS.Timeout;
    if (status === "verifying") {
      loadingTimer = setTimeout(() => setShowLoading(true), 500);
    }
    return () => clearTimeout(loadingTimer);
  }, [status]);

  React.useEffect(() => {
    // Simulate network delay for verification
    const timer = setTimeout(() => {
      // In real scenario, failure would trigger onError
      setStatus("success");
      onVerify("mock-turnstile-token-" + Date.now());
    }, 1200);

    return () => clearTimeout(timer);
  }, [onVerify]);

  if (status === "success") {
    return null; // Silent background verification
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-rose-500 text-sm">
        <span>Security check failed. Please refresh the page and try again.</span>
      </div>
    );
  }

  if (status === "verifying" && showLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verifying security...</span>
      </div>
    );
  }

  return null;
}

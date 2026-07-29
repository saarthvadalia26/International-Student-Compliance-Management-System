"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface TurnstileStubProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function TurnstileStub({ onVerify, onError }: TurnstileStubProps) {
  const [status, setStatus] = React.useState<"verifying" | "success" | "error">("verifying");

  React.useEffect(() => {
    // Simulate network delay for verification
    const timer = setTimeout(() => {
      setStatus("success");
      onVerify("mock-turnstile-token-" + Date.now());
    }, 1200);

    return () => clearTimeout(timer);
  }, [onVerify]);

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm h-[65px] w-full max-w-[300px]">
      <div className="flex-shrink-0 w-8 flex justify-center">
        {status === "verifying" && <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />}
        {status === "success" && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {status === "verifying" ? "Verifying..." : "Success!"}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Security check by Cloudflare
        </span>
      </div>
    </div>
  );
}

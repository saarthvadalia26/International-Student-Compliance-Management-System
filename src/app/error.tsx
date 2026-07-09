"use client";

import * as React from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Standard error logger placeholder
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <ErrorState
        title="Application Error"
        description="An unexpected error occurred. Please try again."
        actionText="Retry"
        onActionClick={reset}
      />
    </div>
  );
}

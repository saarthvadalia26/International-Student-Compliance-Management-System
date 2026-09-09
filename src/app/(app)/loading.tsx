import * as React from "react";
import { Loader2 } from "lucide-react";

/**
 * Global App Router loading fallback for workspace routes.
 * Ensures a consistent, clear spinner shows whenever route information is being loaded.
 */
export default function AppWorkspaceLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3.5 animate-fade-in">
      <Loader2 className="h-9 w-9 animate-spin text-primary" />
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">Loading workspace information...</p>
        <p className="text-xs text-muted-foreground">Retrieving compliance and student records</p>
      </div>
    </div>
  );
}

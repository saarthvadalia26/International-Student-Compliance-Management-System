import * as React from "react";
import { LoadingState } from "@/components/ui/loading-state";

export default function LoadingPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <LoadingState message="Preparing the workspace..." size="lg" />
    </div>
  );
}

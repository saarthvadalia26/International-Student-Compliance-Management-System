import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function LoadingState({
  message = "Loading data...",
  size = "md",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 space-y-4 min-h-[200px]",
        className
      )}
      {...props}
    >
      <Spinner size={size} />
      {message && <p className="font-small text-muted-foreground">{message}</p>}
    </div>
  );
}

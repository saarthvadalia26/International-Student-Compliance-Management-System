import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  actionText = "Try again",
  onActionClick,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-h3 mb-2 text-foreground">{title}</h3>
      <p className="font-caption max-w-sm mb-6 text-muted-foreground">{description}</p>
      {actionText && onActionClick && (
        <Button onClick={onActionClick} variant="destructive" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
}

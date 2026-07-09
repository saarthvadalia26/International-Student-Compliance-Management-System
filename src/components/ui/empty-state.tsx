import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onActionClick,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-h3 mb-2 text-foreground">{title}</h3>
      <p className="font-caption max-w-sm mb-6 text-muted-foreground">{description}</p>
      {actionText && onActionClick && (
        <Button onClick={onActionClick} variant="outline" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface NotFoundStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function NotFoundState({
  title = "Page or Resource Not Found",
  description = "The item you are looking for does not exist or has been moved.",
  actionText,
  onActionClick,
  className,
  ...props
}: NotFoundStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[300px]",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
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

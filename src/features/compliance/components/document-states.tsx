import * as React from "react";
import { AlertCircle, Loader2, EyeOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ message = "No records found matching current filter parameters." }: { message?: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-border/40 rounded-xl bg-muted/5">
      <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">Database Table Empty</h3>
      <p className="text-xs text-muted-foreground max-w-sm font-caption">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading data parameters..." }: { label?: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground font-small">{label}</span>
    </div>
  );
}

export function ErrorState({ title = "Network Error", message = "Failed to query resources. Please check your network connection.", onRetry }: { title?: string, message?: string, onRetry?: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-rose-500/10 rounded-xl bg-rose-500/5">
      <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
      <h3 className="text-sm font-semibold text-rose-600 mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm font-caption mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="h-8 text-xs border-rose-500/20 text-rose-600 hover:bg-rose-500/10" onClick={onRetry}>
          Retry Query
        </Button>
      )}
    </div>
  );
}

export function DocumentViewer({ url, title }: { url: string | null; title: string }): React.JSX.Element {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed rounded-lg bg-muted/10 h-[500px]">
        <EyeOff className="h-10 w-10 text-muted-foreground/35 mb-2" />
        <span className="text-xs text-muted-foreground font-caption">No PDF source URL available to preview.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-border/60 rounded-lg overflow-hidden bg-background">
      <div className="bg-muted/15 border-b border-border/40 px-3 py-2 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{title} Preview</span>
        <a href={url} download className="text-primary hover:underline font-semibold">Download file</a>
      </div>
      <iframe 
        src={url} 
        title={title} 
        className="w-full flex-1 border-0" 
        role="document"
        aria-label={title}
      />
    </div>
  );
}

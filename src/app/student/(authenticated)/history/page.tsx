"use client";

import * as React from "react";
import Link from "next/link";
import { 
  History, 
  Clock, 
  FileText, 
  Loader2, 
  Check, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Upload,
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentActivityHistory } from "../../actions";
import { StudentHistoryRow, StudentReminderHistoryRow } from "@/domain/student-portal/types";
import { cn } from "@/lib/utils";

export default function StudentHistoryPage() {
  const supabase = getBrowserSupabase();
  const [history, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [, setReminders] = React.useState<StudentReminderHistoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            setError("Unable to authenticate student session. Please try signing in again.");
          }
          return;
        }

        const data = await fetchStudentActivityHistory(session.access_token);
        if (mounted) {
          setHistory(data.history || []);
          setReminders(data.reminders || []);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[STUDENT_HISTORY_PAGE_ERROR]", msg);
          setError("Failed to retrieve activity history. Please check your network connection and try again.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [supabase, reloadTrigger]);

  const handleRetry = () => {
    setReloadTrigger(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Loading activity history timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto space-y-4 my-8">
        <Alert variant="destructive" className="rounded-2xl p-5 border-destructive/30 bg-destructive/5">
          <ShieldAlert className="h-5 w-5 mt-0.5" />
          <AlertTitle className="text-sm font-semibold">Activity History Error</AlertTitle>
          <AlertDescription className="text-xs mt-1 text-muted-foreground">
            {error}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button
            onClick={handleRetry}
            size="sm"
            className="text-xs font-semibold rounded-xl gap-2 px-5 h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Activity History Timeline</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Chronological audit trail of document uploads, verification approvals, and reminder alerts.</p>
      </div>

      <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card">
        <CardHeader className="p-0 pb-4 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Compliance Activity History
            </span>
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {history.length} {history.length === 1 ? "Record" : "Records"}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 pt-6">
          {history.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Activity Recorded Yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  You have not submitted any compliance documents. Upload your Passport, Visa, or eFRRO certificate to begin building your compliance record.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/student/efrro">
                  <Button size="sm" className="text-xs font-semibold rounded-xl gap-2 h-9 px-4">
                    <Upload className="h-4 w-4" />
                    Upload First Document
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {history.map((item, idx) => {
                const isApproved = item.verificationStatus === "APPROVED" || item.verificationStatus === "COMPLIANT";
                const isRejected = item.verificationStatus === "REJECTED";

                return (
                  <div key={item.versionId || idx} className="relative flex items-start gap-4 text-xs">
                    <div className={cn(
                      "absolute -left-[31px] top-0 h-5 w-5 rounded-full flex items-center justify-center border-2 bg-background z-10",
                      isApproved ? "border-emerald-500 text-emerald-500" :
                      isRejected ? "border-rose-500 text-rose-500" : "border-amber-500 text-amber-500"
                    )}>
                      {isApproved ? <Check className="h-3 w-3" /> :
                       isRejected ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>

                    <div className="flex-1 space-y-1 bg-accent/30 p-4 rounded-xl border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          {item.filename}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          isApproved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" :
                          isRejected ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30" : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        )}>
                          {item.verificationStatus.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Uploaded on {new Date(item.uploadDate).toLocaleString()}
                      </p>

                      {item.reviewerComments && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-background border border-border/60 text-[11px] text-foreground space-y-0.5">
                          <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Staff Remarks:</span>
                          <p>{item.reviewerComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

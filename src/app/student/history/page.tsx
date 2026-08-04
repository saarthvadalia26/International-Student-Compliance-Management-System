"use client";

import * as React from "react";
import { 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Bell, 
  Loader2, 
  Check, 
  XCircle 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentDashboard } from "../actions";
import { StudentHistoryRow, StudentReminderHistoryRow } from "@/domain/student-portal/types";
import { cn } from "@/lib/utils";

export default function StudentHistoryPage() {
  const supabase = getBrowserSupabase();
  const [history, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [reminders, setReminders] = React.useState<StudentReminderHistoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const data = await fetchStudentDashboard(session.access_token);
        if (mounted) {
          setHistory(data.history);
          setReminders(data.reminders);
          setIsLoading(false);
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
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
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Compliance Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          {history.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No historical compliance records found.
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

                    <div className="flex-1 space-y-1 bg-accent/30 p-3.5 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          {item.filename}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          isApproved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                          isRejected ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        )}>
                          {item.verificationStatus}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Uploaded on {new Date(item.uploadDate).toLocaleString()}
                      </p>

                      {item.reviewerComments && (
                        <div className="mt-2 p-2 rounded bg-background border border-border/60 text-[11px] text-foreground">
                          <strong>Staff Remarks:</strong> {item.reviewerComments}
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

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
  RefreshCw, 
  Upload,
  ShieldAlert,
  Bell,
  Mail,
  MessageSquare
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentActivityHistory } from "../../actions";
import { StudentHistoryRow, StudentReminderHistoryRow } from "@/domain/student-portal/types";
import { StudentHistorySkeleton } from "@/components/student/student-skeletons";
import { getDocumentBadgeClass } from "@/features/compliance/constants/constants";
import { cn } from "@/lib/utils";

export default function StudentHistoryPage() {
  const supabase = getBrowserSupabase();
  const [history, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [reminders, setReminders] = React.useState<StudentReminderHistoryRow[]>([]);
  const [activeTab, setActiveTab] = React.useState<"uploads" | "reminders">("uploads");
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
        const jwt = session?.access_token || "test_token";
        const data = await fetchStudentActivityHistory(jwt);
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

  const getDocBadgeColor = (type?: string) => {
    return getDocumentBadgeClass(type);
  };

  if (isLoading) {
    return <StudentHistorySkeleton />;
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
    <div className="space-y-6 max-w-4xl mx-auto text-xs animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Compliance Activity & Reminders</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Chronological audit log of document uploads, verification approvals, and automated compliance reminder alerts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/40 w-fit">
        <button
          onClick={() => setActiveTab("uploads")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "uploads"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Document Upload History ({history.length})
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "reminders"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          Received Expiry Alerts ({reminders.length})
        </button>
      </div>

      {activeTab === "uploads" && (
        <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card">
          <CardHeader className="p-0 pb-4 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Compliance Document Upload History
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
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
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

                      <div className="flex-1 space-y-1.5 bg-accent/30 p-4 rounded-xl border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              {item.filename}
                            </span>
                            {item.documentType && (
                              <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${getDocBadgeColor(item.documentType)}`}>
                                {item.documentType}
                              </Badge>
                            )}
                          </div>
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
      )}

      {activeTab === "reminders" && (
        <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card">
          <CardHeader className="p-0 pb-4 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Automated Expiry Alerts & Reminders Sent
              </span>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {reminders.length} {reminders.length === 1 ? "Alert" : "Alerts"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-6">
            {reminders.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Bell className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
                <h3 className="text-sm font-semibold text-foreground">No Expiry Alerts Dispatched</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You have not received any expiration warning reminders. Reminders are automatically scheduled based on your verified Passport, Visa, and eFRRO expiry dates.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => {
                  const ctx = r.details || {};
                  const docType = (r.documentType || (ctx.document_type as string) || "Document").toLowerCase();
                  const daysLeft = ctx.days_left || ctx.days_remaining;

                  return (
                    <div key={r.id} className="p-3.5 rounded-xl border border-border/50 bg-accent/20 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${getDocBadgeColor(docType)}`}>
                            {docType}
                          </Badge>
                          <span className="font-semibold text-foreground text-xs">
                            {docType.toUpperCase()} Expiration Reminder
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {daysLeft ? `${daysLeft} days before expiration notice` : "Compliance alert dispatched"}{" "}
                          via <span className="capitalize font-medium text-foreground">{r.channel}</span> on {new Date(r.sentAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {r.channel === "email" ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-emerald-500" />
                        )}
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

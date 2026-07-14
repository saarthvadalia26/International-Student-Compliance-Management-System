"use client";

import * as React from "react";
import { History, FileText, CheckCircle, Clock, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentDashboard } from "../actions";
import { StudentHistoryRow } from "@/domain/student-portal/types";

export default function StudentHistoryPage() {
  const supabase = getBrowserSupabase();
  
  const [history, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active student session found.");
        }

        const jwt = session.access_token;
        const data = await fetchStudentDashboard(jwt);

        if (mounted) {
          setHistory(data.history);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setIsLoading(false);
        }
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
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading upload history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/35 bg-destructive/5 text-destructive p-6 max-w-lg mx-auto mt-10">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Failed to load upload history</h3>
            <p className="text-xs text-muted-foreground/80 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Upload History</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review all your historical eFRRO document updates and their compliance verification status.
        </p>
      </div>

      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <History className="h-4 w-4 text-muted-foreground" /> Document Submission History
          </CardTitle>
          <CardDescription className="text-xs">Audit log of your compliance submissions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No historical renewal uploads registered.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Document File</TableHead>
                  <TableHead className="text-xs">Upload Date</TableHead>
                  <TableHead className="text-xs">Verification Status</TableHead>
                  <TableHead className="text-xs">Review Details & Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.versionId}>
                    <TableCell className="text-xs font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]" title={row.filename}>{row.filename}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(row.uploadDate).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.verificationStatus === "approved" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {row.verificationStatus === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15">
                          <Clock className="h-3 w-3" /> Pending Review
                        </span>
                      )}
                      {row.verificationStatus === "rejected" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/15">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {row.reviewerComments ? (
                        <div className="space-y-0.5">
                          <p className="italic text-foreground">&ldquo;{row.reviewerComments}&rdquo;</p>
                          {row.reviewedAt && (
                            <p className="text-[10px] font-mono">Reviewed at: {new Date(row.reviewedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

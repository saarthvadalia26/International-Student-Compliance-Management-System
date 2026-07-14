"use client";

import * as React from "react";
import Link from "next/link";
import { 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Bell, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentDashboard } from "../actions";
import { StudentPortalProfile, StudentHistoryRow, StudentReminderHistoryRow } from "@/domain/student-portal/types";

export default function StudentDashboardPage() {
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [history, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [reminders, setReminders] = React.useState<StudentReminderHistoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active student session found.");
        }

        const jwt = session.access_token;
        const data = await fetchStudentDashboard(jwt);

        if (mounted) {
          setProfile(data.profile);
          setHistory(data.history);
          setReminders(data.reminders);
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

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading dashboard overview...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="border-destructive/35 bg-destructive/5 text-destructive p-6 max-w-lg mx-auto mt-10">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Failed to load student dashboard</h3>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {error || "Student identity coordinates could not be loaded."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Determine eFRRO compliance badge
  const isExpired = profile.efrroStatus === "EXPIRED";
  const isWarning = profile.efrroStatus === "WARNING";
  const isPending = profile.efrroStatus === "PENDING_VERIFICATION";
  const isCompliant = profile.efrroStatus === "COMPLIANT";

  return (
    <div className="space-y-6">
      {/* Welcome Block */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Workspace</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review your compliance statistics, reminder queues, and submit document updates.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-center">
            {/* Student bio info */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{profile.fullName}</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Registration No: {profile.registrationNumber}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pl-10 space-y-0.5">
                <p>Programme: <span className="font-medium text-foreground">{profile.programme}</span></p>
                <p>School: <span className="font-medium text-foreground">{profile.school}</span></p>
                <p>Nationality: <span className="font-medium text-foreground">{profile.nationality}</span></p>
              </div>
            </div>

            {/* Current eFRRO Status Badge */}
            <div className="flex flex-col items-center justify-center p-4 border-l border-border/50">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">eFRRO Status</span>
              {isCompliant && (
                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                  <CheckCircle className="h-3.5 w-3.5" /> Compliant
                </div>
              )}
              {isPending && (
                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-semibold text-xs border border-yellow-500/20 animate-pulse">
                  <Clock className="h-3.5 w-3.5" /> Pending Verification
                </div>
              )}
              {isWarning && (
                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/20">
                  <AlertTriangle className="h-3.5 w-3.5" /> Expiring Soon
                </div>
              )}
              {isExpired && (
                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive font-semibold text-xs border border-destructive/20">
                  <ShieldAlert className="h-3.5 w-3.5" /> Expired
                </div>
              )}
              {profile.efrroExpiry && (
                <span className="text-[10px] text-muted-foreground/80 mt-2 font-mono">
                  Expiry: {new Date(profile.efrroExpiry).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Days Remaining block */}
            <div className="flex flex-col items-center justify-center p-4 border-l border-border/50">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Days Remaining</span>
              {profile.daysRemaining !== null ? (
                <span className={`text-2xl font-bold mt-1 font-mono ${profile.daysRemaining <= 15 ? "text-destructive" : profile.daysRemaining <= 30 ? "text-amber-500" : "text-foreground"}`}>
                  {profile.daysRemaining} Days
                </span>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground mt-2">N/A</span>
              )}
              <Link href="/student/efrro" passHref>
                <Button size="xs" variant="outline" className="mt-3 text-[10px] h-7 gap-1">
                  Renew Now <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Split grid for History Tables */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Upload History list */}
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" /> Document Upload History
            </CardTitle>
            <CardDescription className="text-xs">Your previous document submissions and audits status.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No renewal documents submitted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Document File</TableHead>
                    <TableHead className="text-xs">Uploaded Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.versionId}>
                      <TableCell className="text-xs font-medium truncate max-w-[160px]" title={row.filename}>
                        {row.filename}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {new Date(row.uploadDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.verificationStatus === "approved" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                            Verified
                          </span>
                        )}
                        {row.verificationStatus === "pending" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15">
                            Pending Review
                          </span>
                        )}
                        {row.verificationStatus === "rejected" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/15" title={row.reviewerComments || undefined}>
                            Rejected
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reminder History list */}
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-muted-foreground" /> Compliance Reminders History
            </CardTitle>
            <CardDescription className="text-xs">Compliance reminders and alert dispatches logged by the cell.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reminders.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No reminders sent to your address yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Trigger Source</TableHead>
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs">Dispatch Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs capitalize font-medium text-foreground">
                        {row.triggerSource.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-xs capitalize font-mono">{row.channel}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {new Date(row.sentAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

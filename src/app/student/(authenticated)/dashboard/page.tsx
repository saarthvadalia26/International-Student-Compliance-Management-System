"use client";

import * as React from "react";
import Link from "next/link";
import { 
  User,
  AlertTriangle, 
  CheckCircle2, 
  Globe2, 
  Award, 
  Upload, 
  AlertCircle, 
  FileCheck2, 
  History,
  ShieldAlert,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentDashboard } from "../../actions";
import { StudentPortalProfile, StudentHistoryRow, StudentReminderHistoryRow } from "@/domain/student-portal/types";
import { cn } from "@/lib/utils";

export default function StudentDashboardPage() {
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [, setHistory] = React.useState<StudentHistoryRow[]>([]);
  const [, setReminders] = React.useState<StudentReminderHistoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token || "test_token";
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
          <span className="text-xs text-muted-foreground">Loading student dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="border-destructive/35 bg-destructive/5 text-destructive p-6 max-w-lg mx-auto mt-10 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Failed to load student dashboard</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {error || "Student identity coordinates could not be retrieved."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const isOverallCompliant = profile.overallCompliance === "COMPLIANT";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="border-border/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Student Avatar / Photo Fallback */}
            <div className="h-16 w-16 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-2xl text-primary shadow-inner shrink-0">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{profile.fullName}</h1>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  isOverallCompliant ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                )}>
                  {isOverallCompliant ? "Compliant" : "Attention Required"}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Enrollment: <strong className="text-white">{profile.registrationNumber}</strong></span>
                <span>•</span>
                <span>Programme: <strong className="text-white">{profile.programme}</strong></span>
                <span>•</span>
                <span>Nationality: <strong className="text-white">{profile.nationality || "International"}</strong></span>
              </p>
            </div>
          </div>

          <Link href="/student/efrro">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-2 shadow-sm rounded-xl px-4 h-9">
              <Upload className="h-4 w-4" />
              Document Centre
            </Button>
          </Link>
        </div>
      </Card>

      {/* Compliance Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Passport Status */}
        <Card className="border-border/80 rounded-2xl p-4 shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Passport Status</span>
            <FileCheck2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className={cn(
              "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
              profile.passportStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              profile.passportStatus === "REJECTED" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {profile.passportStatus.replace("_", " ")}
            </span>
            <p className="text-[11px] text-muted-foreground mt-2">
              {profile.passportExpiry ? `Expires: ${profile.passportExpiry}` : "No passport on file"}
            </p>
          </div>
        </Card>

        {/* Visa Status */}
        <Card className="border-border/80 rounded-2xl p-4 shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Visa Status</span>
            <Globe2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <span className={cn(
              "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
              profile.visaStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              profile.visaStatus === "REJECTED" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {profile.visaStatus.replace("_", " ")}
            </span>
            <p className="text-[11px] text-muted-foreground mt-2">
              {profile.visaExpiry ? `Expires: ${profile.visaExpiry}` : "No visa on file"}
            </p>
          </div>
        </Card>

        {/* eFRRO Status */}
        <Card className="border-border/80 rounded-2xl p-4 shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">eFRRO Registration</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <span className={cn(
              "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
              profile.efrroStatus === "COMPLIANT" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              profile.efrroStatus === "WARNING" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {profile.efrroStatus.replace("_", " ")}
            </span>
            <p className="text-[11px] text-muted-foreground mt-2">
              {profile.daysRemaining !== null ? `${profile.daysRemaining} days remaining` : "Pending compliance"}
            </p>
          </div>
        </Card>

        {/* Overall Status Badge */}
        <Card className="border-border/80 rounded-2xl p-4 shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overall Compliance</span>
            <CheckCircle2 className={cn("h-4 w-4", isOverallCompliant ? "text-emerald-500" : "text-amber-500")} />
          </div>
          <div className="mt-3">
            <span className={cn(
              "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
              isOverallCompliant ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            )}>
              {profile.overallCompliance.replace("_", " ")}
            </span>
            <p className="text-[11px] text-muted-foreground mt-2">
              {isOverallCompliant ? "All requirements satisfied" : "Action required on documents"}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expiry Alerts & Remarks */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card">
            <CardHeader className="p-0 pb-4 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Compliance Actions & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-3">
              {profile.passportRemarks && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Passport Remarks:</strong> {profile.passportRemarks}
                  </div>
                </div>
              )}

              {profile.visaRemarks && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Visa Remarks:</strong> {profile.visaRemarks}
                  </div>
                </div>
              )}

              {profile.efrroRemarks && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">eFRRO Remarks:</strong> {profile.efrroRemarks}
                  </div>
                </div>
              )}

              {!profile.passportRemarks && !profile.visaRemarks && !profile.efrroRemarks && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>No outstanding rejection remarks or urgent actions required on your account.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Links & Summary */}
        <div className="space-y-6">
          <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-2">
              <Link href="/student/efrro" className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-accent hover:border-accent transition-colors text-xs font-medium text-foreground">
                <span className="flex items-center gap-2.5">
                  <Upload className="h-4 w-4 text-primary" />
                  Document Centre
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href="/student/profile" className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-accent hover:border-accent transition-colors text-xs font-medium text-foreground">
                <span className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-primary" />
                  View Full Profile
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link href="/student/history" className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-accent hover:border-accent transition-colors text-xs font-medium text-foreground">
                <span className="flex items-center gap-2.5">
                  <History className="h-4 w-4 text-primary" />
                  Activity History Timeline
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

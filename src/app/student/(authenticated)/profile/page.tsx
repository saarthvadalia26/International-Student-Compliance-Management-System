"use client";

import * as React from "react";
import { 
  User, 
  Mail, 
  Globe, 
  BookOpen, 
  Loader2 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentProfile } from "../../actions";
import { StudentPortalProfile } from "@/domain/student-portal/types";
import { cn } from "@/lib/utils";

export default function StudentProfilePage() {
  const supabase = getBrowserSupabase();
  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token || "test_token";
        const data = await fetchStudentProfile(jwt);
        if (mounted) {
          setProfile(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    loadProfile();

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

  if (error || !profile) {
    return (
      <Card className="border-destructive/35 bg-destructive/5 text-destructive p-6 max-w-lg mx-auto">
        <p className="text-xs">{error || "Failed to load profile details."}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Summary Card */}
      <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl border-2 border-primary/20 shrink-0">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">{profile.fullName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{profile.registrationNumber}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-primary" /> {profile.programme}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-primary" /> {profile.nationality || "International"}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Grid: Personal & Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Personal & Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium text-foreground">{profile.fullName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Enrollment Number</span>
              <span className="font-mono font-medium text-foreground">{profile.registrationNumber}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">School / Faculty</span>
              <span className="font-medium text-foreground">{profile.school}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Nationality</span>
              <span className="font-medium text-foreground">{profile.nationality || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Email Address</span>
              <span className="font-medium text-foreground">{profile.email || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Local Phone Number</span>
              <span className="font-medium text-foreground">{profile.phoneLocal || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Home Phone Number</span>
              <span className="font-medium text-foreground">{profile.phoneHome || "N/A"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Compliance Records (Passport, Visa, eFRRO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Passport Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">Passport Record</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
              profile.passportStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              {profile.passportStatus.replace("_", " ")}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">Number: <strong className="text-foreground">{profile.passportNumber || "N/A"}</strong></p>
            <p className="text-muted-foreground">Expiry: <strong className="text-foreground">{profile.passportExpiry || "N/A"}</strong></p>
            {profile.passportRemarks && (
              <p className="text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg mt-2">
                Remarks: {profile.passportRemarks}
              </p>
            )}
          </div>
        </Card>

        {/* Visa Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">Visa Record</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
              profile.visaStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              {profile.visaStatus.replace("_", " ")}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">Number: <strong className="text-foreground">{profile.visaNumber || "N/A"}</strong></p>
            <p className="text-muted-foreground">Type: <strong className="text-foreground">{profile.visaType || "Student Visa"}</strong></p>
            <p className="text-muted-foreground">Expiry: <strong className="text-foreground">{profile.visaExpiry || "N/A"}</strong></p>
          </div>
        </Card>

        {/* eFRRO Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">eFRRO Certificate</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
              profile.efrroStatus === "COMPLIANT" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              {profile.efrroStatus.replace("_", " ")}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">Expiry Date: <strong className="text-foreground">{profile.efrroExpiry || "N/A"}</strong></p>
            <p className="text-muted-foreground">Days Remaining: <strong className="text-foreground">{profile.daysRemaining ?? "N/A"}</strong></p>
          </div>
        </Card>
      </div>
    </div>
  );
}

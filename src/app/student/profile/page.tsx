"use client";

import * as React from "react";
import { User, Mail, Phone, Loader2, ShieldAlert, GraduationCap, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { fetchStudentProfile } from "../actions";
import { StudentPortalProfile } from "@/domain/student-portal/types";

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
        if (!session) {
          throw new Error("No active student session found.");
        }

        const jwt = session.access_token;
        const studentProfile = await fetchStudentProfile(jwt);

        if (mounted) {
          setProfile(studentProfile);
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

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading profile information...</span>
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
            <h3 className="text-sm font-semibold">Failed to load student profile</h3>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {error || "Student identity coordinates could not be loaded."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Review your institutional registration details, nationality, and contact coordinates.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1">
        {/* Personal Details */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" /> Personal Details
            </CardTitle>
            <CardDescription className="text-xs">Your personal biographical credentials registered with NFSU.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Full Name</span>
                <p className="text-sm font-semibold text-foreground">{profile.fullName}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Registration Number</span>
                <p className="text-sm font-semibold text-foreground font-mono">{profile.registrationNumber}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Nationality / Country</span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {profile.nationality}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Enrollment */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-muted-foreground" /> Academic Program
            </CardTitle>
            <CardDescription className="text-xs">Enrollment tracks details and school designations.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Degree / Programme</span>
                <p className="text-sm font-semibold text-foreground">{profile.programme}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Academic School</span>
                <p className="text-sm font-semibold text-foreground">{profile.school}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Coordinates */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" /> Contact Coordinates
            </CardTitle>
            <CardDescription className="text-xs">Your registered contact numbers and address coordinates.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Email Address</span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {profile.email}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Home Country Phone</span>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {profile.phoneHome}
                </p>
              </div>
              {profile.phoneLocal && (
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Local Contact Phone</span>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {profile.phoneLocal}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

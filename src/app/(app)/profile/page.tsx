"use client";

import * as React from "react";
import { User, Mail, Shield, Calendar, Clock, Edit2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { updateMyProfileNameAction } from "./actions";
import { getInitials, isNameComplete } from "@/utils/name-utils";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils/date";

export default function AdminProfilePage() {
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = React.useState<{
    email: string;
    fullName: string;
    role: string;
    isComplete: boolean;
    lastLogin: string | null;
    createdAt: string | null;
  } | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");

  // Reusable save action button states
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function loadAdminSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const email = session.user.email || "";
          const metadata = session.user.user_metadata || {};
          const rawName = (metadata.full_name as string | undefined)?.trim();
          const hasCompleteName = isNameComplete(rawName);
          const fullName = hasCompleteName ? (rawName as string) : "Profile Incomplete";
          
          const rawRole = (metadata.role as string | undefined)?.toLowerCase().trim();
          const displayRole =
            rawRole === "administrator" || rawRole === "admin"
              ? "Administrator"
              : rawRole === "staff"
              ? "Staff"
              : metadata.role
              ? String(metadata.role).charAt(0).toUpperCase() + String(metadata.role).slice(1)
              : "Staff Member";
          
          setProfile({
            email,
            fullName,
            role: displayRole,
            isComplete: hasCompleteName,
            lastLogin: session.user.last_sign_in_at || null,
            createdAt: session.user.created_at || null,
          });
          setEditName(hasCompleteName ? (rawName as string) : "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadAdminSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (!isNameComplete(cleanName)) {
      toast.error("Validation Error", {
        description: "Full name must be at least 2 characters long.",
      });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      await updateMyProfileNameAction(cleanName);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: cleanName,
              isComplete: true,
            }
          : null
      );
      setSaveSuccess(true);
      
      // Delay closing editing state slightly to allow success state animation to show
      setTimeout(() => {
        setIsEditing(false);
      }, 700);

      toast.success("Profile updated successfully", {
        description: "Your institutional real name has been updated.",
      });
    } catch (err: unknown) {
      setSaveError(true);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to update profile", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-2">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center font-sans">
        <p className="text-sm text-destructive font-semibold">User session details not found.</p>
      </div>
    );
  }

  const initials = profile.isComplete ? getInitials(profile.fullName) : "--";

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your institutional identity, verified real name, credentials, and session coordinates.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* User Card */}
        <Card className="border border-border/60 shadow-sm md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shadow-sm font-mono">
              {initials}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground break-words">
                {profile.fullName}
              </h2>
              <div>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15 uppercase font-mono">
                  <Shield className="h-3 w-3" /> {profile.role}
                </span>
              </div>
            </div>

            {!profile.isComplete && (
              <div className="w-full rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">
                    <p className="font-semibold">Profile Incomplete</p>
                    <p className="mt-0.5 text-muted-foreground">Please click Edit Profile below to enter your real full name.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Form Card */}
        <Card className="border border-border/60 shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" /> Account & Institutional Coordinates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Full Legal Name</span>
                    <p className="text-sm font-semibold text-foreground">{profile.fullName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Authentication Email</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {profile.email}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Assigned Role</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" /> {profile.role}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Account Created</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> 
                      {profile.createdAt ? formatDate(profile.createdAt) : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Last Session Login</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {profile.lastLogin ? formatDateTime(profile.lastLogin) : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Full Name
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between" htmlFor="fullName">
                    <span>Full Legal Name <span className="text-destructive">*</span></span>
                    <span className="text-[10px] text-muted-foreground font-normal">e.g. Dr. Skvadalia Shah, Rahul Kumar</span>
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter your real full name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-sm font-sans"
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This real name is your canonical display identity across all ISCMS modules.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Authentication Email (Read-Only)</span>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="h-9 text-sm bg-muted/40 cursor-not-allowed text-muted-foreground font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Institutional Role (Read-Only)</span>
                  <Input
                    type="text"
                    value={profile.role}
                    disabled
                    className="h-9 text-sm bg-muted/40 cursor-not-allowed text-muted-foreground"
                  />
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditName(profile.isComplete ? profile.fullName : "");
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="text-xs h-8"
                    isLoading={isSaving}
                    isSuccess={saveSuccess}
                    isError={saveError}
                    idleText="Save Full Name"
                    loadingText="Saving..."
                    successText="Changes Saved"
                    errorText="Try Again"
                  />
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

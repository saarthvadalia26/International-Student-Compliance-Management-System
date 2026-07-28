"use client";

import * as React from "react";
import { User, Mail, Shield, Calendar, Clock, Edit2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = React.useState<{
    email: string;
    fullName: string;
    role: string;
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
          const name = metadata.username || email.split("@")[0] || "Administrator";
          const role = metadata.role || "administrator";
          
          setProfile({
            email,
            fullName: name.charAt(0).toUpperCase() + name.slice(1),
            role: role.charAt(0).toUpperCase() + role.slice(1),
            lastLogin: session.user.last_sign_in_at || null,
            createdAt: session.user.created_at || null,
          });
          setEditName(name.charAt(0).toUpperCase() + name.slice(1));
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
    if (!editName.trim()) {
      toast.error("Validation Error", { description: "Full name cannot be blank." });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: editName.trim() }
      });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, fullName: editName.trim() } : null);
      setSaveSuccess(true);
      
      // Delay closing editing state slightly to allow success state animation to show
      setTimeout(() => {
        setIsEditing(false);
      }, 800);

      toast.success("Profile updated successfully", {
        description: "Your administrative coordinates have been updated."
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

  const initials = profile.fullName.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your administrative profile settings, credentials, and track session activity.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* User Card */}
        <Card className="border border-border/60 shadow-sm md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shadow-sm">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{profile.fullName}</h2>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15 uppercase font-mono">
                <Shield className="h-3 w-3" /> {profile.role}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Details Form Card */}
        <Card className="border border-border/60 shadow-sm md:col-span-2">
          <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Full Name</span>
                    <p className="text-sm font-semibold text-foreground">{profile.fullName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Email Address</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {profile.email}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Account Created</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> 
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Last Session Login</span>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="fullName">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Email Address</span>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="h-9 text-sm bg-muted/40 cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditName(profile.fullName);
                      setIsEditing(false);
                    }}
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
                    idleText="Save Changes"
                    loadingText="Saving changes..."
                    successText="Changes saved"
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

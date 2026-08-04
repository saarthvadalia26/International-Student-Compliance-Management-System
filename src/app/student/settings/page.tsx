"use client";

import * as React from "react";
import { Settings, KeyRound, Bell, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { updateStudentPasswordAction } from "../actions";
import { toast } from "sonner";

export default function StudentSettingsPage() {
  const supabase = getBrowserSupabase();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = React.useState(true);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      const res = await updateStudentPasswordAction(session.access_token, newPassword);
      if (res.success) {
        toast.success("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Failed to update password.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Account Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your student portal password, security options, and notification preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Password Management Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Account Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full text-xs font-semibold rounded-xl h-9 mt-2"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...</>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
        <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-4">
          <CardHeader className="p-0 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <div>
                <p className="font-semibold text-foreground">Email Compliance Alerts</p>
                <p className="text-[11px] text-muted-foreground">Receive expiration warnings via official email</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => { setEmailAlerts(e.target.checked); toast.success("Preferences saved."); }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-foreground">WhatsApp Reminders</p>
                <p className="text-[11px] text-muted-foreground">Receive urgent reminders on registered phone number</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => { setWhatsappAlerts(e.target.checked); toast.success("Preferences saved."); }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

/**
 * EmergencyLogoutDialog
 *
 * Administrator-only dialog that:
 * 1. Shows a severe warning with user count
 * 2. Re-authenticates the Administrator (password verification)
 * 3. Calls emergencyForceLogoutAction() server action
 * 4. Broadcasts emergency_logout to all connected tabs via Realtime
 * 5. Signs out the Administrator and redirects to /login
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useRealtime } from "@/providers/realtime-provider";
import { emergencyForceLogoutAction, getActiveUserScopeAction, type ActiveUserScope } from "@/app/(app)/settings/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface EmergencyLogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "confirm" | "reauth" | "executing" | "done";

export function EmergencyLogoutDialog({ open, onOpenChange }: EmergencyLogoutDialogProps) {
  const router = useRouter();
  const { broadcastSessionLogout } = useRealtime();
  const supabase = getBrowserSupabase();

  const [step, setStep] = React.useState<Step>("confirm");
  const [userScope, setUserScope] = React.useState<ActiveUserScope | null>(null);
  const [password, setPassword] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Load user scope when dialog opens
  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("confirm");
    setPassword("");
    setReason("");
    setErrorMsg("");
    setUserScope(null);

    getActiveUserScopeAction()
      .then(scope => setUserScope(scope))
      .catch(() => setUserScope(null));
  }, [open]);

  const handleConfirm = () => {
    setStep("reauth");
    setErrorMsg("");
  };

  const handleReAuthenticate = async () => {
    if (!password) {
      setErrorMsg("Please enter your current password to continue.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) throw new Error("Could not retrieve administrator email.");

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Incorrect password. Please try again.");

      // Password verified — proceed to execute
      setStep("executing");
      setIsVerifying(false);
      await executeForceLogout();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
      setIsVerifying(false);
    }
  };

  const executeForceLogout = async () => {
    setIsExecuting(true);
    try {
      const result = await emergencyForceLogoutAction(
        reason || "Emergency security action initiated by Administrator."
      );

      // Broadcast to all connected browser tabs
      broadcastSessionLogout("emergency_logout");

      toast.success(`Emergency logout complete.`, {
        description: `${result.sessionsTerminated} sessions terminated across ${result.usersAffected} authorized Main Portal ${result.usersAffected === 1 ? "user" : "users"}.`,
        duration: 5000,
      });

      setStep("done");

      // Sign out the administrator and redirect
      setTimeout(async () => {
        await supabase.auth.signOut({ scope: "local" });
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Emergency logout failed.";
      setErrorMsg(msg);
      toast.error("Emergency logout failed.", { description: msg });
      setStep("reauth");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    if (isExecuting || step === "done") return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[460px] font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-base font-bold">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            Emergency Force Logout
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            This action is irreversible and immediate.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs text-destructive font-medium space-y-1.5">
                  <p>This will immediately terminate <strong>every active session</strong> across the entire system.</p>
                  <div>
                    {userScope !== null ? (
                      <div className="space-y-0.5">
                        <p>
                          {userScope.total === 1
                            ? "1 authorized Main Portal user account will be affected."
                            : `${userScope.total} authorized Main Portal user accounts will be affected.`}
                        </p>
                        {userScope.total > 0 && (
                          <p className="text-[11px] text-destructive/80 font-normal">
                            • {userScope.administrators} {userScope.administrators === 1 ? "Administrator" : "Administrators"}
                            {userScope.staff > 0 ? `, ${userScope.staff} ${userScope.staff === 1 ? "Staff member" : "Staff members"}` : ""}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>Loading affected user count…</p>
                    )}
                  </div>
                  <p>You will also be signed out and must re-authenticate.</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Suspected security breach"
                className="h-9 text-xs"
                maxLength={250}
              />
            </div>
            <DialogFooter className="flex-row gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="text-xs" onClick={handleConfirm}>
                Continue — Re-authenticate
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Re-authentication */}
        {step === "reauth" && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Enter your Administrator password to confirm this operation.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Current Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReAuthenticate()}
                className="h-9 text-xs"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}
            </div>
            <DialogFooter className="flex-row gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleCancel} disabled={isVerifying}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs min-w-[140px]"
                onClick={handleReAuthenticate}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Verifying…</>
                ) : (
                  "Confirm — Force Logout All"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Executing */}
        {(step === "executing" || isExecuting) && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            <p className="text-xs text-muted-foreground text-center">
              Terminating all active sessions…<br />Please wait.
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="py-6 flex flex-col items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="text-xs text-center text-muted-foreground">
              All sessions have been terminated.<br />
              You will be redirected to the login page.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

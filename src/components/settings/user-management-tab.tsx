"use client";

import * as React from "react";
import { Users, UserPlus, Shield, KeyRound, Ban, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { toast } from "sonner";
import {
  fetchUserAccountsAction,
  createStaffAccountAction,
  promoteStaffToAdminAction,
  demoteAdminToStaffAction,
  toggleUserAccountStatusAction,
  resetUserPasswordAdminAction,
  UserAccountItem,
} from "@/app/(app)/settings/actions";

export function UserManagementTab() {
  const [users, setUsers] = React.useState<UserAccountItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Create Staff Modal state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newFullName, setNewFullName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Reset Password Modal state
  const [resetTargetUser, setResetTargetUser] = React.useState<UserAccountItem | null>(null);
  const [resetPasswordText, setResetPasswordText] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);

  const [activeActionId, setActiveActionId] = React.useState<string | null>(null);

  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUserAccountsAction();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load user accounts.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newFullName) {
      toast.error("Please fill out all required fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsCreating(true);
      await createStaffAccountAction({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
      });
      toast.success(`Staff account created for ${newEmail}`);
      setIsCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create staff account.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePromote = async (user: UserAccountItem) => {
    try {
      setActiveActionId(user.id);
      await promoteStaffToAdminAction(user.id);
      toast.success(`${user.fullName} promoted to Administrator.`);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed promoting user.";
      toast.error(msg);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDemote = async (user: UserAccountItem) => {
    try {
      setActiveActionId(user.id);
      await demoteAdminToStaffAction(user.id);
      toast.success(`${user.fullName} demoted to Staff.`);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed demoting administrator.";
      toast.error(msg);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleToggleStatus = async (user: UserAccountItem) => {
    const shouldDisable = !user.isDisabled;
    try {
      setActiveActionId(user.id);
      await toggleUserAccountStatusAction(user.id, shouldDisable);
      toast.success(`User ${user.fullName} ${shouldDisable ? "disabled" : "enabled"}.`);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed updating user status.";
      toast.error(msg);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!resetPasswordText || resetPasswordText.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsResetting(true);
      await resetUserPasswordAdminAction(resetTargetUser.id, resetPasswordText);
      toast.success(`Password reset for ${resetTargetUser.fullName}.`);
      setResetTargetUser(null);
      setResetPasswordText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed resetting password.";
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-border/60 shadow-sm p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading user accounts...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="bg-muted/10 border-b border-border/40 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" /> Administrator & Staff Accounts
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Manage system permissions, promote Staff to Administrators, disable accounts, and reset passwords.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 gap-1.5 text-xs font-semibold">
            <UserPlus className="h-3.5 w-3.5" /> Create Staff Account
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/20 border-b border-border/40 text-muted-foreground font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {users.map((u) => {
                  const isProcessing = activeActionId === u.id;
                  const isAdmin = u.role === "administrator";

                  return (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{u.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/20">
                            <Shield className="h-3 w-3" /> Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            Staff
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.isDisabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/20">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDemote(u)}
                              disabled={isProcessing}
                              title="Demote to Staff"
                              className="h-7 text-xs px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            >
                              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Demote"}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePromote(u)}
                              disabled={isProcessing}
                              title="Promote to Administrator"
                              className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                            >
                              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Promote"}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetTargetUser(u)}
                            disabled={isProcessing}
                            title="Reset Password"
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isProcessing}
                            title={u.isDisabled ? "Enable User" : "Disable User"}
                            className={`h-7 text-xs px-2 ${
                              u.isDisabled
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-destructive hover:bg-destructive/10"
                            }`}
                          >
                            {u.isDisabled ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal 1: Create Staff Account */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl outline-none">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Create Staff Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 mb-4">
              All newly created accounts default to the restricted Staff role.
            </DialogDescription>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Full Name</label>
                <Input
                  placeholder="Officer Name"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Staff Email</label>
                <Input
                  type="email"
                  placeholder="staff@nfsu.ac.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Initial Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Create Staff"}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>

      {/* Modal 2: Admin Reset Password */}
      <Dialog open={Boolean(resetTargetUser)} onOpenChange={(open) => !open && setResetTargetUser(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl outline-none">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 mb-4">
              Reset password for <strong className="text-foreground">{resetTargetUser?.fullName}</strong> ({resetTargetUser?.email}).
            </DialogDescription>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">New Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={resetPasswordText}
                  onChange={(e) => setResetPasswordText(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setResetTargetUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isResetting}>
                  {isResetting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Reset Password"}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

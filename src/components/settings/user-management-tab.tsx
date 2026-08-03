"use client";

import * as React from "react";
import { Users, UserPlus, Shield, KeyRound, Ban, CheckCircle, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import {
  fetchUserAccountsAction,
  createStaffAccountAction,
  promoteStaffToAdminAction,
  demoteAdminToStaffAction,
  toggleUserAccountStatusAction,
  resetUserPasswordAdminAction,
  deleteStaffAccountAction,
  UserAccountItem,
} from "@/app/(app)/settings/actions";

export function UserManagementTab() {
  const { isAdministrator } = useUserRole();

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

  // Delete Staff Modal state
  const [deleteTargetUser, setDeleteTargetUser] = React.useState<UserAccountItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

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
      const msg = err instanceof Error ? err.message : "Failed demoting user.";
      toast.error(msg);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleToggleStatus = async (user: UserAccountItem) => {
    try {
      setActiveActionId(user.id);
      await toggleUserAccountStatusAction(user.id, !user.isDisabled);
      toast.success(`User ${user.isDisabled ? "enabled" : "disabled"} successfully.`);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed toggling status.";
      toast.error(msg);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!resetPasswordText || resetPasswordText.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsResetting(true);
      await resetUserPasswordAdminAction(resetTargetUser.id, resetPasswordText);
      toast.success(`Password reset successfully for ${resetTargetUser.email}`);
      setResetTargetUser(null);
      setResetPasswordText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed resetting password.";
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetUser) return;
    if (deleteConfirmText.trim() !== "DELETE") {
      toast.error("Please type DELETE to confirm account deletion.");
      return;
    }

    try {
      setIsDeleting(true);
      await deleteStaffAccountAction(deleteTargetUser.id);
      toast.success(`Staff account deleted for ${deleteTargetUser.email}`);
      setDeleteTargetUser(null);
      setDeleteConfirmText("");
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete user account.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 shadow-xs backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" /> Administrator & Staff Accounts
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Manage system permissions, promote Staff to Administrators, disable accounts, and reset passwords.
            </CardDescription>
          </div>
          {isAdministrator && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Staff Account
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border/50">
                <tr>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Created At</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading user accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isAdmin = u.role === "administrator";
                    const isProcessing = activeActionId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{u.fullName || "Unnamed User"}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Shield className="h-3 w-3" /> Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Staff
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {u.isDisabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
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
                            {isAdministrator && (
                              <>
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
                                      : "text-amber-600 hover:bg-amber-500/10"
                                  }`}
                                >
                                  {u.isDisabled ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteTargetUser(u);
                                    setDeleteConfirmText("");
                                  }}
                                  disabled={isProcessing}
                                  title="Delete Account Permanently"
                                  className="h-7 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal 1: Create Staff Account */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Create Staff Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              All newly created accounts default to the restricted Staff role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Full Name</label>
              <Input
                type="text"
                placeholder="Dr. Staff Member"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Staff Email</label>
              <Input
                type="email"
                placeholder="staff@nfsu.ac.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Initial Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs"
                required
                minLength={8}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Create Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Admin Reset Password */}
      <Dialog open={!!resetTargetUser} onOpenChange={(open) => !open && setResetTargetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" /> Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a new password for <span className="font-semibold text-foreground">{resetTargetUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={resetPasswordText}
                onChange={(e) => setResetPasswordText(e.target.value)}
                className="h-9 text-xs"
                required
                minLength={8}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetTargetUser(null)}
                disabled={isResetting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isResetting}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResetting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Set New Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Delete Staff Account Confirmation */}
      <Dialog
        open={!!deleteTargetUser}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetUser(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4 shrink-0" /> Permanent Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are about to permanently delete the staff account for{" "}
              <span className="font-semibold text-foreground">{deleteTargetUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>Warning: This action cannot be undone</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>The staff member will lose access to ISCMS immediately.</li>
              <li>All active sessions and tokens will be permanently revoked.</li>
              <li>Existing student records, passports, visas, and filings remain 100% intact.</li>
              <li>Audit logs will retain historical traceability for this user.</li>
            </ul>
          </div>

          <form onSubmit={handleDeleteUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
              </label>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="h-9 text-xs font-mono tracking-wider border-rose-500/30 focus:border-rose-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTargetUser(null);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isDeleting || deleteConfirmText.trim() !== "DELETE"}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

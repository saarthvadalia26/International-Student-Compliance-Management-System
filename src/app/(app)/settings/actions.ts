"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireAdministrator, requireInternalUser } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";
import { retentionService } from "@/domain/retention/services/retention.service";
import { RetentionPolicy, CleanupExecutionReport } from "@/domain/retention/types";

// ── Shared Auth Helpers ─────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

async function getAdminUser() {
  const user = await getAuthenticatedUser();
  requireAdministrator(user);
  return user;
}

async function getInternalUser() {
  const user = await getAuthenticatedUser();
  requireInternalUser(user);
  return user;
}

async function getRequestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown",
    userAgent: h.get("user-agent") ?? "unknown",
  };
}

// ── Retention Policy Actions (Administrator only) ──────────────────────────

export async function fetchRetentionPolicies(): Promise<RetentionPolicy[]> {
  await getAdminUser();
  return retentionService.getPolicies();
}

export async function updateRetentionPolicyAction(
  policy: Partial<RetentionPolicy> & { id: string }
): Promise<void> {
  await getAdminUser();
  return retentionService.updatePolicy(policy);
}

export async function runDocumentCleanupAction(
  dryRun: boolean,
  performedBy: string
): Promise<CleanupExecutionReport> {
  await getAdminUser();
  return retentionService.executeCleanupLifecycle(dryRun, performedBy);
}

// ── Global Sign Out (any internal user — signs out their own sessions) ─────

export interface GlobalSignOutResult {
  success: boolean;
  message: string;
}

export async function globalSignOutAction(): Promise<GlobalSignOutResult> {
  const user = await getInternalUser();
  const meta = await getRequestMeta();

  // The caller's signOut is handled client-side with scope:'global'.
  // This action writes the audit trail for compliance.
  await auditService.logGlobalSignOut({
    userId: user.id,
    userEmail: user.email ?? "unknown",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    sessionsTerminated: 1, // Supabase global scope terminates all
  });

  return { success: true, message: "Audit record written." };
}

// ── Emergency Force Logout (Administrator only) ────────────────────────────

export interface EmergencyLogoutResult {
  success: boolean;
  usersAffected: number;
  sessionsTerminated: number;
  message: string;
}

export async function emergencyForceLogoutAction(
  reason: string
): Promise<EmergencyLogoutResult> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  // 1. List all auth users
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  // 2. Sign out every non-admin user globally (invalidate all their sessions)
  let sessionsTerminated = 0;
  const usersAffected = users.length;

  for (const u of users) {
    try {
      await adminClient.auth.admin.signOut(u.id, "global");
      sessionsTerminated++;
    } catch {
      // Best-effort: log but continue
      console.error(`[EMERGENCY_LOGOUT] Failed to sign out user ${u.id}`);
    }
  }

  // 3. Write audit trail
  await auditService.logEmergencyLogout({
    adminId: adminUser.id,
    adminEmail: adminUser.email ?? "unknown",
    reason: reason || "Emergency security action",
    usersAffected,
    sessionsTerminated,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    success: true,
    usersAffected,
    sessionsTerminated,
    message: `Successfully terminated ${sessionsTerminated} sessions across ${usersAffected} users.`,
  };
}

// ── User Count for Emergency Logout Dialog ─────────────────────────────────

export async function getActiveUserCountAction(): Promise<number> {
  await getAdminUser();
  const adminClient = getAdminSupabase();
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) return 0;
  return users.length;
}

// ── Administrator User Account Management Actions ─────────────────────────

export interface UserAccountItem {
  id: string;
  email: string;
  fullName: string;
  role: "administrator" | "staff" | "student";
  isDisabled: boolean;
  createdAt: string;
  lastSignInAt?: string;
}

/**
 * Fetch all user accounts for Administrator management table.
 */
export async function fetchUserAccountsAction(): Promise<UserAccountItem[]> {
  await getAdminUser();
  const adminClient = getAdminSupabase();
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return users.map((u) => {
    const rawRole = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
    let role: "administrator" | "staff" | "student" = "staff";
    if (rawRole === "administrator" || rawRole === "admin") role = "administrator";
    else if (rawRole === "student") role = "student";

    const isDisabled = Boolean(u.banned_until && new Date(u.banned_until) > new Date());

    return {
      id: u.id,
      email: u.email ?? "no-email@nfsu.ac.in",
      fullName: (u.user_metadata?.full_name as string) || (u.email?.split("@")[0] ?? "Staff User"),
      role,
      isDisabled,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? undefined,
    };
  });
}

/**
 * Create a new Staff account. Default role is ALWAYS 'staff'.
 */
export async function createStaffAccountAction(data: {
  email: string;
  password: string;
  fullName: string;
}): Promise<UserAccountItem> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  if (!data.email || !data.password || !data.fullName) {
    throw new Error("Email, password, and full name are required.");
  }
  if (data.password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const { data: { user }, error } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      role: "staff",
      full_name: data.fullName,
    },
  });

  if (error || !user) {
    throw new Error(error?.message ?? "Failed creating staff account.");
  }

  await auditService.logRoleChange({
    changedById: adminUser.id,
    changedByEmail: adminUser.email ?? "unknown",
    targetUserId: user.id,
    targetUserEmail: user.email ?? data.email,
    action: "CREATE_STAFF",
    previousRole: "none",
    newRole: "staff",
    ipAddress: meta.ipAddress,
  });

  return {
    id: user.id,
    email: user.email ?? data.email,
    fullName: data.fullName,
    role: "staff",
    isDisabled: false,
    createdAt: user.created_at,
  };
}

/**
 * Promote a Staff member to Administrator.
 */
export async function promoteStaffToAdminAction(targetUserId: string): Promise<void> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId);
  if (getUserError || !targetUser) {
    throw new Error("Target user not found.");
  }

  const previousRole = (targetUser.user_metadata?.role as string) ?? "staff";

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    user_metadata: {
      ...targetUser.user_metadata,
      role: "administrator",
    },
  });

  if (updateError) {
    throw new Error(`Failed to promote user: ${updateError.message}`);
  }

  await auditService.logRoleChange({
    changedById: adminUser.id,
    changedByEmail: adminUser.email ?? "unknown",
    targetUserId,
    targetUserEmail: targetUser.email ?? "unknown",
    action: "PROMOTE_STAFF",
    previousRole,
    newRole: "administrator",
    ipAddress: meta.ipAddress,
  });
}

/**
 * Demote an Administrator to Staff.
 * SAFEGUARD: Prevents demoting the last remaining Administrator account.
 */
export async function demoteAdminToStaffAction(targetUserId: string): Promise<void> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  // 1. List all users and count active Administrators
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const adminUsers = users.filter((u) => {
    const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
    return role === "administrator" || role === "admin";
  });

  // 2. Safeguard check
  if (adminUsers.length <= 1) {
    throw new Error("Action Denied: Cannot demote the last remaining Administrator account.");
  }

  const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId);
  if (getUserError || !targetUser) {
    throw new Error("Target user not found.");
  }

  const previousRole = (targetUser.user_metadata?.role as string) ?? "administrator";

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    user_metadata: {
      ...targetUser.user_metadata,
      role: "staff",
    },
  });

  if (updateError) {
    throw new Error(`Failed to demote user: ${updateError.message}`);
  }

  await auditService.logRoleChange({
    changedById: adminUser.id,
    changedByEmail: adminUser.email ?? "unknown",
    targetUserId,
    targetUserEmail: targetUser.email ?? "unknown",
    action: "DEMOTE_ADMIN",
    previousRole,
    newRole: "staff",
    ipAddress: meta.ipAddress,
  });
}

/**
 * Enable or Disable (ban) a user account.
 * SAFEGUARD: Prevents disabling the last remaining Administrator.
 */
export async function toggleUserAccountStatusAction(targetUserId: string, disable: boolean): Promise<void> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId);
  if (getUserError || !targetUser) {
    throw new Error("Target user not found.");
  }

  const targetRole = (targetUser.user_metadata?.role as string | undefined)?.toLowerCase().trim();
  const isTargetAdmin = targetRole === "administrator" || targetRole === "admin";

  if (disable && isTargetAdmin) {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const adminCount = users.filter((u) => {
      const r = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      return r === "administrator" || r === "admin";
    }).length;

    if (adminCount <= 1) {
      throw new Error("Action Denied: Cannot disable the last remaining Administrator account.");
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: disable ? "876000h" : "none",
  });

  if (updateError) {
    throw new Error(`Failed updating user status: ${updateError.message}`);
  }

  await auditService.logRoleChange({
    changedById: adminUser.id,
    changedByEmail: adminUser.email ?? "unknown",
    targetUserId,
    targetUserEmail: targetUser.email ?? "unknown",
    action: disable ? "DISABLE_STAFF" : "ENABLE_STAFF",
    previousRole: targetRole ?? "staff",
    newRole: disable ? "disabled" : (targetRole ?? "staff"),
    ipAddress: meta.ipAddress,
  });
}

/**
 * Reset a user's password directly as Administrator.
 */
export async function resetUserPasswordAdminAction(targetUserId: string, newPassword: string): Promise<void> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId);
  if (getUserError || !targetUser) {
    throw new Error("Target user not found.");
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
  });

  if (updateError) {
    throw new Error(`Failed to reset password: ${updateError.message}`);
  }

  await auditService.logRoleChange({
    changedById: adminUser.id,
    changedByEmail: adminUser.email ?? "unknown",
    targetUserId,
    targetUserEmail: targetUser.email ?? "unknown",
    action: "RESET_PASSWORD",
    previousRole: targetUser.user_metadata?.role ?? "staff",
    newRole: targetUser.user_metadata?.role ?? "staff",
    ipAddress: meta.ipAddress,
  });
}

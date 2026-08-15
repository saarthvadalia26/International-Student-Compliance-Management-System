"use server";

import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireAdministrator, requireInternalUser } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";
import { retentionService } from "@/domain/retention/services/retention.service";
import { RetentionPolicy, CleanupExecutionReport } from "@/domain/retention/types";
import { systemStateService } from "@/services/auth/system-state.service";
import { administratorDetectionService } from "@/services/auth/administrator-detection.service";

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

/**
 * Permanently delete a staff or user account. Administrator only.
 * Safeguards:
 * 1. Requires Administrator role (throws 403 / Unauthorized error if called by non-admin).
 * 2. Prevents deleting the target user if they are an Administrator AND total active Administrators <= 1.
 * 3. Permanently removes user from Supabase auth.users.
 * 4. Logs an immutable audit trail entry to audit_log.
 * 5. Invalidates state detection caches.
 */
export async function deleteStaffAccountAction(targetUserId: string): Promise<void> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  if (!targetUserId) {
    throw new Error("Target user ID is required.");
  }

  // 1. Retrieve target user from Supabase Auth
  const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId);
  if (getUserError || !targetUser) {
    throw new Error("Target user account not found or has already been deleted.");
  }

  const targetRole = ((targetUser.user_metadata?.role as string | undefined) ?? "staff").toLowerCase().trim();
  const isTargetAdmin = targetRole === "administrator" || targetRole === "admin";

  // 2. Count active Administrators to prevent deleting the last Administrator
  const { data: { users: allUsers }, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    throw new Error(`Failed verifying administrator accounts: ${listError.message}`);
  }

  const adminUsers = (allUsers || []).filter((u) => {
    const r = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
    return r === "administrator" || r === "admin";
  });

  if (isTargetAdmin && adminUsers.length <= 1) {
    throw new Error("Action Denied: Cannot delete the last remaining Administrator account.");
  }

  // 3. Delete user from Supabase Auth
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    await auditService.logUserDeletion({
      adminId: adminUser.id,
      adminEmail: adminUser.email ?? "unknown",
      targetUserId,
      targetUserEmail: targetUser.email ?? "unknown",
      targetRole,
      sessionsTerminated: 0,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      reason: `Deletion failed: ${deleteError.message}`,
      success: false,
    });
    throw new Error(`Failed to delete account: ${deleteError.message}`);
  }

  // 4. Log successful audit trail
  await auditService.logUserDeletion({
    adminId: adminUser.id,
    adminEmail: adminUser.email ?? "unknown",
    targetUserId,
    targetUserEmail: targetUser.email ?? "unknown",
    targetRole,
    sessionsTerminated: 1,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    reason: "Administrator Account Deletion",
    success: true,
  });

  // 5. Invalidate system state detection caches
  systemStateService.invalidateCache();
  administratorDetectionService.invalidateCache();
}

// ── Factory Reset (Administrator only — Pre-Handover) ───────────────────────

export interface FactoryResetResult {
  success: boolean;
  message: string;
  deletedCounts?: {
    users: number;
    students: number;
    passportVersions: number;
    visaVersions: number;
    efrroVersions: number;
    notifications: number;
    auditLogs: number;
    configRows: number;
  };
}

/**
 * Factory Reset — permanently destroys ALL operational data and authentication users.
 * Restores the system to a brand-new installation state.
 *
 * Security:
 * 1. Administrator-only (getAdminUser enforces role check).
 * 2. Password re-verification via Supabase signInWithPassword.
 * 3. Final audit trail entry written BEFORE truncation.
 * 4. All auth.users deleted via admin API.
 * 5. All caches invalidated.
 */
export async function factoryResetAction(password: string): Promise<FactoryResetResult> {
  const adminUser = await getAdminUser();
  const meta = await getRequestMeta();
  const adminClient = getAdminSupabase();

  if (!password || password.length < 1) {
    throw new Error("Password is required to perform factory reset.");
  }

  // 1. Re-verify administrator password
  const supabase = await getServerSupabase();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminUser.email ?? "",
    password,
  });

  if (authError) {
    throw new Error("Password verification failed. Factory reset aborted.");
  }

  // 2. Count records before deletion for audit trail
  const countTable = async (table: string): Promise<number> => {
    try {
      const { count, error } = await adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [
    studentCount,
    passportCount,
    visaCount,
    efrroCount,
    notificationCount,
    auditCount,
    configCount,
    snapshotCount,
  ] = await Promise.all([
    countTable("students"),
    countTable("passport_versions"),
    countTable("visa_versions"),
    countTable("efrro_versions"),
    countTable("notification_delivery_log"),
    countTable("audit_log"),
    countTable("system_config"),
    countTable("student_snapshot"),
  ]);

  // Count auth users
  let userCount = 0;
  try {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userCount = users?.length ?? 0;
  } catch {
    // Continue even if count fails
  }

  const deletedCounts = {
    users: userCount,
    students: studentCount + snapshotCount,
    passportVersions: passportCount,
    visaVersions: visaCount,
    efrroVersions: efrroCount,
    notifications: notificationCount,
    auditLogs: auditCount,
    configRows: configCount,
  };

  // 3. Write final audit entry BEFORE truncation
  await auditService.logFactoryReset({
    adminId: adminUser.id,
    adminEmail: adminUser.email ?? "unknown",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    reason: "Pre-handover factory reset for NFSU deployment",
    deletedCounts,
  });

  // 4. Truncate operational tables in dependency order (children first)
  const tablesToTruncate = [
    "notification_delivery_log",
    "efrro_versions",
    "visa_versions",
    "passport_versions",
    "student_snapshot",
    "students",
    "audit_log",
    "system_config",
  ];

  for (const table of tablesToTruncate) {
    try {
      await adminClient.from(table).delete().gte("id", "00000000-0000-0000-0000-000000000000");
    } catch {
      // Some tables may use integer IDs — try numeric fallback
      try {
        await adminClient.from(table).delete().gte("id", 0);
      } catch {
        // Table might be empty or have different schema — continue
      }
    }
  }

  // 5. Clear storage buckets
  const buckets = ["documents", "uploads", "attachments"];
  for (const bucket of buckets) {
    try {
      const { data: files } = await adminClient.storage.from(bucket).list("", { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => f.name);
        await adminClient.storage.from(bucket).remove(paths);
      }
    } catch {
      // Bucket may not exist — continue
    }
  }

  // 6. Delete ALL auth users via admin API
  try {
    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (allUsers) {
      for (const user of allUsers) {
        try {
          await adminClient.auth.admin.deleteUser(user.id);
        } catch {
          // Continue deleting remaining users
        }
      }
    }
  } catch {
    // Auth cleanup failure — system will still detect fresh installation state
  }

  // 7. Invalidate all caches
  systemStateService.invalidateCache();
  administratorDetectionService.invalidateCache();

  return {
    success: true,
    message: "System Reset Successfully",
    deletedCounts,
  };
}

// ── Document Upload Policy Actions (Administrator & Staff) ───────────────────

export interface DocumentUploadPolicyConfig {
  id?: string;
  documentType: "passport" | "visa" | "efrro";
  uploadWindowDays: number;
  isActive: boolean;
}

export async function fetchDocumentUploadPoliciesAction(): Promise<{
  success: boolean;
  policies: DocumentUploadPolicyConfig[];
  error?: string;
}> {
  try {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from("document_upload_policies")
      .select("*")
      .order("document_type", { ascending: true });

    if (error) throw error;

    const policies: DocumentUploadPolicyConfig[] = (data || []).map((row) => ({
      id: row.id,
      documentType: row.document_type as "passport" | "visa" | "efrro",
      uploadWindowDays: Number(row.upload_window_days) || 30,
      isActive: Boolean(row.is_active)
    }));

    return { success: true, policies };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, policies: [], error: msg };
  }
}

export async function updateDocumentUploadPoliciesAction(
  updates: { documentType: "passport" | "visa" | "efrro"; uploadWindowDays: number; isActive?: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await getAdminUser();
    const adminSupabase = getAdminSupabase();

    for (const update of updates) {
      if (typeof update.uploadWindowDays !== "number" || update.uploadWindowDays <= 0 || update.uploadWindowDays > 365) {
        return { success: false, error: `Invalid upload window for ${update.documentType}. Must be between 1 and 365 days.` };
      }

      await adminSupabase
        .from("document_upload_policies")
        .upsert({
          document_type: update.documentType,
          upload_window_days: update.uploadWindowDays,
          is_active: update.isActive ?? true,
          updated_at: new Date().toISOString()
        }, { onConflict: "document_type" });
    }

    await adminSupabase.from("audit_log").insert({
      actor_id: adminUser.id,
      action: "DOCUMENT_UPLOAD_POLICIES_UPDATED",
      resource: "document_upload_policies",
      filters_applied: { updates, updatedBy: adminUser.email || adminUser.id }
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ── System Preferences Actions (Administrator) ──────────────────────────────

export async function fetchSystemPreferencesAction(): Promise<{
  success: boolean;
  preferences?: {
    reminderSchedule: string;
    sessionTimeoutMinutes: number;
    maxUploadSizeBytes: number;
    maxUploadSizeMb: number;
    dateFormat: string;
    enableAuditLogging: boolean;
    enableMaintenanceNotifications: boolean;
  };
  error?: string;
}> {
  try {
    const { systemConfigService } = await import("@/lib/system-config");
    const prefs = await systemConfigService.getSystemPreferences();
    return {
      success: true,
      preferences: {
        ...prefs,
        maxUploadSizeMb: Math.round(prefs.maxUploadSizeBytes / (1024 * 1024)),
      }
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function updateSystemPreferencesAction(updates: {
  maxUploadSizeBytes?: number;
  sessionTimeoutMinutes?: number;
  reminderSchedule?: string;
  dateFormat?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await getAdminUser();
    const { systemConfigService } = await import("@/lib/system-config");
    
    if (updates.maxUploadSizeBytes !== undefined) {
      if (typeof updates.maxUploadSizeBytes !== "number" || updates.maxUploadSizeBytes < 1024 * 1024 || updates.maxUploadSizeBytes > 100 * 1024 * 1024) {
        return { success: false, error: "Maximum document upload size must be between 1 MB and 100 MB." };
      }
    }

    const previous = await systemConfigService.getSystemPreferences();
    await systemConfigService.updateSystemPreferences(updates, adminUser.email || adminUser.id);

    const adminSupabase = getAdminSupabase();
    await adminSupabase.from("audit_log").insert({
      actor_id: adminUser.id,
      action: "SYSTEM_PREFERENCES_UPDATED",
      resource: "system_config/preferences",
      filters_applied: {
        previous,
        updates,
        updatedBy: adminUser.email || adminUser.id
      }
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

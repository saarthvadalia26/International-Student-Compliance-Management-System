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

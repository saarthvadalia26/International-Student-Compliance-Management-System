/**
 * Audit Service
 *
 * Centralized server-side audit trail writer for all privileged actions.
 * All methods write to public.audit_log using the service role client to
 * bypass RLS and guarantee the write even if the session is being terminated.
 *
 * SECURITY: This module is server-only. Never import from client components.
 */
import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface GlobalSignOutAuditEntry {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  sessionsTerminated: number;
}

export interface EmergencyLogoutAuditEntry {
  adminId: string;
  adminEmail: string;
  reason: string;
  usersAffected: number;
  sessionsTerminated: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoleChangeAuditEntry {
  changedById: string;
  changedByEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  previousRole: string;
  newRole: string;
}

export interface ConfigChangeAuditEntry {
  userId: string;
  userEmail: string;
  setting: string;
  previousValue: string;
  newValue: string;
}

const auditService = {
  /**
   * Log a Global Sign Out event (current user signing out of all their sessions)
   */
  async logGlobalSignOut(entry: GlobalSignOutAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.userId,
      actor_email: entry.userEmail,
      action: "GLOBAL_SIGN_OUT",
      resource: "auth_session",
      category: "session",
      severity: "info",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        sessions_terminated: entry.sessionsTerminated,
        scope: "global",
      },
    });
  },

  /**
   * Log an Emergency Force Logout event (Administrator forcing all users out)
   */
  async logEmergencyLogout(entry: EmergencyLogoutAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      action: "EMERGENCY_FORCE_LOGOUT",
      resource: "auth_session",
      category: "security",
      severity: "critical",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        reason: entry.reason,
        users_affected: entry.usersAffected,
        sessions_terminated: entry.sessionsTerminated,
        scope: "system_wide",
      },
    });
  },

  /**
   * Log a Role Change event (Administrator promoting or demoting a user)
   */
  async logRoleChange(entry: RoleChangeAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.changedById,
      actor_email: entry.changedByEmail,
      action: "ROLE_CHANGE",
      resource: "user_account",
      category: "role_change",
      severity: "warning",
      details: {
        target_user_id: entry.targetUserId,
        target_user_email: entry.targetUserEmail,
        previous_role: entry.previousRole,
        new_role: entry.newRole,
      },
    });
  },

  /**
   * Log a Configuration Change event (Administrator changing system settings)
   */
  async logConfigChange(entry: ConfigChangeAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.userId,
      actor_email: entry.userEmail,
      action: "CONFIG_CHANGE",
      resource: "system_config",
      category: "config_change",
      severity: "info",
      details: {
        setting: entry.setting,
        previous_value: entry.previousValue,
        new_value: entry.newValue,
      },
    });
  },
};

export { auditService };

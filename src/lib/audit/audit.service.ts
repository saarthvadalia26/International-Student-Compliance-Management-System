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
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionsTerminated: number;
}

export interface EmergencyLogoutAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  reason: string;
  usersAffected: number;
  sessionsTerminated: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoleChangeAuditEntry {
  changedById: string;
  changedByEmail: string;
  changedByName?: string;
  targetUserId: string;
  targetUserEmail: string;
  action?: string;
  previousRole: string;
  newRole: string;
  ipAddress?: string;
}

export interface InitialAdminAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  ipAddress?: string;
}

export interface ConfigChangeAuditEntry {
  userId: string;
  userEmail: string;
  userName?: string;
  setting: string;
  previousValue: string;
  newValue: string;
}

export interface UserDeletionAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  targetUserId: string;
  targetUserEmail: string;
  targetRole: string;
  sessionsTerminated: number;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  success: boolean;
}

export interface FactoryResetAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  ipAddress?: string;
  userAgent?: string;
  reason: string;
  deletedCounts: {
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

export interface AcademicProgramDeletionAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  programId: string;
  programName: string;
  programCode?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface SchoolDeletionAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  schoolId: string;
  schoolName: string;
  schoolCode?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface StudentDeletionAuditEntry {
  adminId: string;
  adminEmail: string;
  adminName?: string;
  studentId: string;
  studentName: string;
  registrationNumber?: string | null;
  deletedCounts?: {
    documents?: number;
    r2Objects?: number;
  };
  ipAddress?: string;
  userAgent?: string;
}

const auditService = {
  /**
   * Log Permanent Student Deletion event (Real database and storage removal)
   */
  async logStudentDeletion(entry: StudentDeletionAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "DELETE_STUDENT",
      resource: "students",
      category: "student",
      severity: "critical",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        student_id: entry.studentId,
        student_name: entry.studentName,
        registration_number: entry.registrationNumber ?? null,
        deleted_counts: entry.deletedCounts ?? {},
        deleted_at: new Date().toISOString(),
      },
    });
  },

  /**
   * Log Academic Program Deletion event (Administrator permanently removing a program)
   */
  async logAcademicProgramDeletion(entry: AcademicProgramDeletionAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "DELETE_ACADEMIC_PROGRAM",
      resource: "academic_programs",
      category: "master_data",
      severity: "warning",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        program_id: entry.programId,
        program_name: entry.programName,
        program_code: entry.programCode ?? null,
      },
    });
  },

  /**
   * Log School / Department Deletion event (Administrator permanently removing a school)
   */
  async logSchoolDeletion(entry: SchoolDeletionAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "DELETE_SCHOOL",
      resource: "schools",
      category: "master_data",
      severity: "warning",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        school_id: entry.schoolId,
        school_name: entry.schoolName,
        school_code: entry.schoolCode ?? null,
      },
    });
  },
  /**
   * Log Initial Administrator Account Setup
   */
  async logInitialAdminSetup(entry: InitialAdminAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "INITIALIZE_ADMIN",
      resource: "system_setup",
      category: "security",
      severity: "critical",
      ip_address: entry.ipAddress ?? null,
      details: {
        event: "Initial Administrator account created",
        role: "administrator",
      },
    });
  },

  /**
   * Log a Global Sign Out event (current user signing out of all their sessions)
   */
  async logGlobalSignOut(entry: GlobalSignOutAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.userId,
      actor_email: entry.userEmail,
      actor_name: entry.userName ?? null,
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
      actor_name: entry.adminName ?? null,
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
   * Log a Role Change event (Administrator promoting, demoting, or modifying a user)
   */
  async logRoleChange(entry: RoleChangeAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.changedById,
      actor_email: entry.changedByEmail,
      actor_name: entry.changedByName ?? null,
      action: entry.action ?? "ROLE_CHANGE",
      resource: "user_account",
      category: "role_change",
      severity: "warning",
      ip_address: entry.ipAddress ?? null,
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
      actor_name: entry.userName ?? null,
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

  /**
   * Log User Account Deletion event (Administrator permanently removing a user account)
   */
  async logUserDeletion(entry: UserDeletionAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "DELETE_USER_ACCOUNT",
      resource: "user_account",
      category: "security",
      severity: "critical",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        target_user_id: entry.targetUserId,
        target_user_email: entry.targetUserEmail,
        target_role: entry.targetRole,
        sessions_terminated: entry.sessionsTerminated,
        reason: entry.reason ?? "Administrator Account Deletion",
        success: entry.success,
      },
    });
  },

  /**
   * Log Factory Reset event — final audit entry before system wipe
   */
  async logFactoryReset(entry: FactoryResetAuditEntry): Promise<void> {
    const admin = getAdminSupabase();
    await admin.from("audit_log").insert({
      actor_id: entry.adminId,
      actor_email: entry.adminEmail,
      actor_name: entry.adminName ?? null,
      action: "FACTORY_RESET",
      resource: "system",
      category: "security",
      severity: "critical",
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: {
        reason: entry.reason,
        deleted_counts: entry.deletedCounts,
        scope: "full_system_reset",
        warning: "All operational data permanently destroyed",
      },
    });
  },
};

export { auditService };
export default auditService;

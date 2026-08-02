import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface SystemInitializationState {
  isInitialized: boolean;
  isDbInitialized: boolean;
  adminCount: number;
  isRecoveryMode: boolean;
  initializedAt?: string;
  initializedBy?: string;
}

export interface UniversityConfig {
  universityName: string;
  shortName: string;
  timezone: string;
  defaultLanguage: string;
  academicYear: string;
  logoUrl?: string;
}

export interface SystemPreferencesConfig {
  reminderSchedule: string;
  sessionTimeoutMinutes: number;
  maxUploadSizeBytes: number;
  dateFormat: string;
  enableAuditLogging: boolean;
  enableMaintenanceNotifications: boolean;
}

export const systemConfigService = {
  /**
   * Check whether the system is initialized.
   * Dual-Condition Initialization Rule:
   * System is initialized ONLY IF system_config.initialization.is_initialized === true
   * AND at least one Administrator user exists in auth.users.
   * If isDbInitialized === true BUT adminCount === 0, Recovery Mode is automatically triggered.
   */
  async checkInitializationState(): Promise<SystemInitializationState> {
    const admin = getAdminSupabase();

    // 1. Count Administrator accounts in auth.users
    let adminCount = 0;
    try {
      const { data: { users }, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!error && users) {
        adminCount = users.filter((u) => {
          const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
          return role === "administrator" || role === "admin";
        }).length;
      }
    } catch {
      adminCount = 0;
    }

    // 2. Query system_config table for initialization status
    let isDbInitialized = false;
    let initializedAt: string | undefined;
    let initializedBy: string | undefined;

    try {
      const { data } = await admin
        .from("system_config")
        .select("value")
        .eq("key", "initialization")
        .maybeSingle();

      if (data?.value) {
        const val = data.value as { is_initialized?: boolean; initialized_at?: string; initialized_by?: string };
        isDbInitialized = Boolean(val.is_initialized);
        initializedAt = val.initialized_at;
        initializedBy = val.initialized_by;
      }
    } catch {
      isDbInitialized = false;
    }

    // Dual-Condition Initialization Rule
    const isInitialized = isDbInitialized && adminCount > 0;

    // Recovery Mode Trigger Rule: Flag is true, BUT zero Administrator accounts exist
    const isRecoveryMode = isDbInitialized && adminCount === 0;

    return {
      isInitialized,
      isDbInitialized,
      adminCount,
      isRecoveryMode,
      initializedAt,
      initializedBy,
    };
  },

  /**
   * Save initial configuration payload and mark system as permanently initialized.
   */
  async saveInitializationPayload(payload: {
    adminEmail: string;
    university: UniversityConfig;
    preferences: SystemPreferencesConfig;
  }): Promise<void> {
    const admin = getAdminSupabase();
    const now = new Date().toISOString();

    const configRows = [
      {
        key: "initialization",
        value: {
          is_initialized: true,
          initialized_at: now,
          initialized_by: payload.adminEmail,
        },
        updated_at: now,
      },
      {
        key: "university",
        value: {
          university_name: payload.university.universityName,
          short_name: payload.university.shortName,
          timezone: payload.university.timezone,
          default_language: payload.university.defaultLanguage,
          academic_year: payload.university.academicYear,
          logo_url: payload.university.logoUrl ?? null,
        },
        updated_at: now,
      },
      {
        key: "preferences",
        value: {
          reminder_schedule: payload.preferences.reminderSchedule,
          session_timeout_minutes: payload.preferences.sessionTimeoutMinutes,
          max_upload_size_bytes: payload.preferences.maxUploadSizeBytes,
          date_format: payload.preferences.dateFormat,
          enable_audit_logging: payload.preferences.enableAuditLogging,
          enable_maintenance_notifications: payload.preferences.enableMaintenanceNotifications,
        },
        updated_at: now,
      },
    ];

    const { error } = await admin.from("system_config").upsert(configRows, { onConflict: "key" });
    if (error) {
      console.warn("[SYSTEM_CONFIG] Upsert to system_config table failed:", error.message);
    }
  },
};

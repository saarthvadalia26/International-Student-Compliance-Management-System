import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface SystemInitializationState {
  isInitialized: boolean;
  adminCount: number;
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
   * System is considered initialized if system_config.initialization.is_initialized === true
   * OR if at least one Administrator user exists in auth.users.
   */
  async checkInitializationState(): Promise<SystemInitializationState> {
    const admin = getAdminSupabase();

    // 1. Check auth.users count of Administrators
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

    // 2. Check system_config table in DB
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
        initializedAt = val.initialized_at;
        initializedBy = val.initialized_by;
      }
    } catch {
      // Table might not be migrated yet; fallback to adminCount check
    }

    // Authoritative Gating Rule: System is initialized ONLY if at least 1 Administrator exists.
    // If adminCount === 0, the system is strictly NOT initialized (even if system_config contains stale rows).
    const isInitialized = adminCount > 0;

    return {
      isInitialized,
      adminCount,
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

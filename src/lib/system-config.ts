import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { systemStateService } from "@/services/auth/system-state.service";

export interface SystemInitializationState {
  isInitialized: boolean;
  isDbInitialized: boolean;
  adminCount: number;
  isRecoveryMode: boolean;
  isFreshInstallation: boolean;
  hasOperationalData: boolean;
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
   * Uses systemStateService to differentiate between:
   * 1. Fresh Installation (No Admin + No Operational Data)
   * 2. Recovery Mode (No Admin + Has Operational Data)
   * 3. System Initialized (Admin Exists + System Config Initialized)
   */
  async checkInitializationState(): Promise<SystemInitializationState> {
    const state = await systemStateService.getSystemState();

    const admin = getAdminSupabase();
    let initializedAt: string | undefined;
    let initializedBy: string | undefined;

    try {
      const { data } = await admin
        .from("system_config")
        .select("value")
        .eq("key", "initialization")
        .maybeSingle();

      if (data?.value) {
        const val = data.value as { initialized_at?: string; initialized_by?: string };
        initializedAt = val.initialized_at;
        initializedBy = val.initialized_by;
      }
    } catch {
      // Table query failed
    }

    return {
      isInitialized: state.isInitialized,
      isDbInitialized: state.isDbInitialized,
      adminCount: state.administratorCount,
      isRecoveryMode: state.isRecoveryMode,
      isFreshInstallation: state.isFreshInstallation,
      hasOperationalData: state.hasOperationalData,
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

    // Invalidate state cache
    systemStateService.invalidateCache();
  },
};

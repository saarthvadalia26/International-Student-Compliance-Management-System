import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { systemStateService } from "@/services/auth/system-state.service";

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10485760; // 10 MB (Single source of truth default)

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

// In-memory cache for fast, low-latency configuration resolution
let cachedPreferences: { data: SystemPreferencesConfig; timestamp: number } | null = null;
let cachedUniversity: { data: UniversityConfig; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export const systemConfigService = {
  /**
   * Invalidate cached system configuration (called after updates)
   */
  invalidateCache(): void {
    cachedPreferences = null;
    cachedUniversity = null;
    systemStateService.invalidateCache();
  },

  /**
   * Check whether the system is initialized.
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
   * Get the single source of truth for maximum document upload size (in bytes).
   * Defaults to 10 MB (10485760 bytes).
   */
  async getMaxUploadSizeBytes(): Promise<number> {
    const prefs = await this.getSystemPreferences();
    return prefs.maxUploadSizeBytes || DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  },

  /**
   * Get system preferences from system_config table.
   */
  async getSystemPreferences(): Promise<SystemPreferencesConfig> {
    const now = Date.now();
    if (cachedPreferences && now - cachedPreferences.timestamp < CACHE_TTL_MS) {
      return cachedPreferences.data;
    }

    const admin = getAdminSupabase();
    const defaults: SystemPreferencesConfig = {
      reminderSchedule: "30,15,7,1",
      sessionTimeoutMinutes: 60,
      maxUploadSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
      dateFormat: "DD/MM/YYYY",
      enableAuditLogging: true,
      enableMaintenanceNotifications: true,
    };

    try {
      const { data, error } = await admin
        .from("system_config")
        .select("value")
        .eq("key", "preferences")
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as Record<string, unknown>;
        const resolved: SystemPreferencesConfig = {
          reminderSchedule: (val.reminder_schedule as string) || defaults.reminderSchedule,
          sessionTimeoutMinutes: Number(val.session_timeout_minutes) || defaults.sessionTimeoutMinutes,
          maxUploadSizeBytes: Number(val.max_upload_size_bytes) || defaults.maxUploadSizeBytes,
          dateFormat: (val.date_format as string) || defaults.dateFormat,
          enableAuditLogging: val.enable_audit_logging !== undefined ? Boolean(val.enable_audit_logging) : defaults.enableAuditLogging,
          enableMaintenanceNotifications: val.enable_maintenance_notifications !== undefined ? Boolean(val.enable_maintenance_notifications) : defaults.enableMaintenanceNotifications,
        };
        cachedPreferences = { data: resolved, timestamp: now };
        return resolved;
      }
    } catch (err) {
      console.warn("[SYSTEM_CONFIG] Failed reading system preferences from database:", err);
    }

    return defaults;
  },

  /**
   * Get university configuration from system_config table.
   */
  async getUniversityConfig(): Promise<UniversityConfig> {
    const now = Date.now();
    if (cachedUniversity && now - cachedUniversity.timestamp < CACHE_TTL_MS) {
      return cachedUniversity.data;
    }

    const admin = getAdminSupabase();
    const defaults: UniversityConfig = {
      universityName: "National Forensic Sciences University",
      shortName: "NFSU",
      timezone: "Asia/Kolkata",
      defaultLanguage: "en",
      academicYear: "2026-2027",
    };

    try {
      const { data, error } = await admin
        .from("system_config")
        .select("value")
        .eq("key", "university")
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as Record<string, unknown>;
        const resolved: UniversityConfig = {
          universityName: (val.university_name as string) || defaults.universityName,
          shortName: (val.short_name as string) || defaults.shortName,
          timezone: (val.timezone as string) || defaults.timezone,
          defaultLanguage: (val.default_language as string) || defaults.defaultLanguage,
          academicYear: (val.academic_year as string) || defaults.academicYear,
          logoUrl: (val.logo_url as string) || undefined,
        };
        cachedUniversity = { data: resolved, timestamp: now };
        return resolved;
      }
    } catch (err) {
      console.warn("[SYSTEM_CONFIG] Failed reading university config from database:", err);
    }

    return defaults;
  },

  /**
   * Update system preferences in system_config table and invalidate cache immediately.
   */
  async updateSystemPreferences(
    updates: Partial<SystemPreferencesConfig>,
    adminEmail?: string
  ): Promise<SystemPreferencesConfig> {
    const current = await this.getSystemPreferences();
    const updated: SystemPreferencesConfig = {
      ...current,
      ...updates,
      maxUploadSizeBytes: updates.maxUploadSizeBytes !== undefined ? Number(updates.maxUploadSizeBytes) : current.maxUploadSizeBytes,
    };

    const admin = getAdminSupabase();
    const now = new Date().toISOString();

    const { error } = await admin.from("system_config").upsert({
      key: "preferences",
      value: {
        reminder_schedule: updated.reminderSchedule,
        session_timeout_minutes: updated.sessionTimeoutMinutes,
        max_upload_size_bytes: updated.maxUploadSizeBytes,
        date_format: updated.dateFormat,
        enable_audit_logging: updated.enableAuditLogging,
        enable_maintenance_notifications: updated.enableMaintenanceNotifications,
        updated_by: adminEmail || "system",
      },
      updated_at: now,
    }, { onConflict: "key" });

    if (error) {
      throw new Error(`Failed to update system preferences: ${error.message}`);
    }

    this.invalidateCache();
    return updated;
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

    this.invalidateCache();
  },
};

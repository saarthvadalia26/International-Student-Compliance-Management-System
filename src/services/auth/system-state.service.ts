import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SystemStateResult {
  administratorExists: boolean;
  administratorCount: number;
  hasOperationalData: boolean;
  isDbInitialized: boolean;
  isFreshInstallation: boolean;
  isRecoveryMode: boolean;
  isInitialized: boolean;
  timestamp: number;
}

interface CacheEntry {
  result: SystemStateResult;
  expiresAt: number;
}

let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds brief server-side cache

function getServiceRoleSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const systemStateService = {
  /**
   * Intelligently inspect database state to differentiate between:
   * 1. Fresh Installation (No Admin + No Operational Data)
   * 2. Recovery Mode (Previously Initialized + No Admin + Has Operational Data)
   * 3. Fully Initialized System (Admin Exists + System Config Initialized)
   */
  async getSystemState(forceRefresh = false): Promise<SystemStateResult> {
    const now = Date.now();

    if (!forceRefresh && memoryCache && memoryCache.expiresAt > now) {
      return memoryCache.result;
    }

    const supabaseAdmin = getServiceRoleSupabase();
    let administratorCount = 0;
    let administratorExists = false;
    let isDbInitialized = false;
    let hasOperationalData = false;

    if (supabaseAdmin) {
      // 1. Check Auth for Administrators
      try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (!error && users) {
          administratorCount = users.filter((u) => {
            const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
            return role === "administrator" || role === "admin";
          }).length;
          administratorExists = administratorCount > 0;
        }
      } catch (err) {
        console.error("[SYSTEM_STATE] Auth.users query failed:", err);
      }

      // 2. Check system_config table for initialization flag
      try {
        const { data } = await supabaseAdmin
          .from("system_config")
          .select("value")
          .eq("key", "initialization")
          .maybeSingle();

        if (data?.value) {
          const val = data.value as { is_initialized?: boolean };
          isDbInitialized = Boolean(val.is_initialized);
        }
      } catch (err) {
        console.error("[SYSTEM_STATE] system_config query failed:", err);
      }

      // 3. Fast short-circuit operational data inspection
      hasOperationalData = await this.checkOperationalDataPresence(supabaseAdmin);
    }

    // Intelligent State Deduction Matrix:
    // 1. A system is Initialized ONLY IF an Administrator exists AND system_config is marked initialized
    const isInitialized = administratorExists && isDbInitialized;

    // 2. Recovery Mode MUST meet ALL 3 strict criteria:
    //    - Previously initialized (isDbInitialized === true)
    //    - NO Administrator account exists (administratorExists === false)
    //    - Operational data DOES exist in database (hasOperationalData === true)
    const isRecoveryMode = !administratorExists && isDbInitialized && hasOperationalData;

    // 3. Fresh Installation IF NO Administrator exists AND Operational Data does NOT exist (even if flag was true from dev reset)
    const isFreshInstallation = !administratorExists && !isRecoveryMode;

    const result: SystemStateResult = {
      administratorExists,
      administratorCount,
      hasOperationalData,
      isDbInitialized,
      isFreshInstallation,
      isRecoveryMode,
      isInitialized,
      timestamp: now,
    };

    memoryCache = {
      result,
      expiresAt: now + CACHE_TTL_MS,
    };

    return result;
  },

  /**
   * Fast short-circuit check across key operational tables.
   * Stops immediately as soon as a single record is found in any operational table.
   */
  async checkOperationalDataPresence(admin: SupabaseClient): Promise<boolean> {
    const operationalTables = [
      "students",
      "student_snapshot",
      "passport_versions",
      "visa_versions",
      "efrro_versions",
      "audit_log",
      "notification_delivery_log",
    ];

    for (const table of operationalTables) {
      try {
        const { data, error } = await admin.from(table).select("id").limit(1);
        if (!error && data && data.length > 0) {
          return true; // Short-circuit: Found operational data!
        }
      } catch {
        // Table might not exist yet or be empty; continue checking remaining tables
      }
    }

    return false;
  },

  /**
   * Clear the server-side memory cache
   */
  invalidateCache(): void {
    memoryCache = null;
  },
};

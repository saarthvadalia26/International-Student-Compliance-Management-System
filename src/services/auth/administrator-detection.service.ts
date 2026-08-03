import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface AdministratorDetectionResult {
  administratorExists: boolean;
  administratorCount: number;
  isDbInitialized: boolean;
  recoveryRequired: boolean;
  isInitialized: boolean;
  timestamp: number;
}

interface CacheEntry {
  result: AdministratorDetectionResult;
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

export const administratorDetectionService = {
  /**
   * Securely detect Administrator existence, count, and Recovery Mode status.
   * Executed on server/middleware with brief in-memory TTL caching.
   */
  async detectAdministratorState(forceRefresh = false): Promise<AdministratorDetectionResult> {
    const now = Date.now();

    if (!forceRefresh && memoryCache && memoryCache.expiresAt > now) {
      return memoryCache.result;
    }

    const supabaseAdmin = getServiceRoleSupabase();
    let administratorCount = 0;
    let administratorExists = false;
    let isDbInitialized = false;

    if (supabaseAdmin) {
      try {
        // 1. Query auth.users via Admin Service Role API
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
        console.error("[ADMIN_DETECTION] Auth.users query failed:", err);
      }

      try {
        // 2. Query system_config table
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
        console.error("[ADMIN_DETECTION] system_config query failed:", err);
      }
    }

    // System is Initialized ONLY IF isDbInitialized is true AND at least one Administrator exists
    const isInitialized = isDbInitialized && administratorExists;

    // Recovery Required IF system_config says initialized, BUT zero Administrators exist
    const recoveryRequired = isDbInitialized && !administratorExists;

    const result: AdministratorDetectionResult = {
      administratorExists,
      administratorCount,
      isDbInitialized,
      recoveryRequired,
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
   * Manually invalidate the server cache (e.g. after setup completion or user deletion).
   */
  invalidateCache(): void {
    memoryCache = null;
  },
};

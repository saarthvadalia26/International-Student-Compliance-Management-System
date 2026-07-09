import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Expose an administrative Supabase client initialized with the service role key.
 * Bypasses RLS. Strictly restricted to server-side code execution.
 */
export function getAdminSupabase(): SupabaseClient {
  // Defensive guard against browser execution leaks
  if (typeof window !== "undefined") {
    throw new Error(
      "[SECURITY_VIOLATION] Attempted to instantiate the administrative service role client in the browser."
    );
  }

  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[SUPABASE_ERROR] Missing required configurations for administrative service-role client."
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return adminClient;
}

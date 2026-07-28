import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Expose a browser-safe Supabase client initialized with the anonymous key.
 * This client respects RLS rules and is safe to use in Client Components.
 * Automatically synchronizes sessions using secure HttpOnly cookies via SSR.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[SUPABASE_ERROR] Client public environment variables (URL/Anon Key) are missing."
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

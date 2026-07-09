import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

/**
 * Expose a server-side client initialized with the anonymous key.
 * Used in server-side operations (like Server Components or Server Actions) where authenticated user context is parsed.
 */
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[SUPABASE_ERROR] Public environment variables (URL/Anon Key) are missing on the server."
    );
  }

  serverClient = createClient(supabaseUrl, supabaseAnonKey);
  return serverClient;
}

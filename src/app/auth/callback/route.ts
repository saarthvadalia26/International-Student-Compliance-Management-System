import { type NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Standard Next.js Auth Callback Route Handler
 * Validates Supabase authentication tokens/codes and establishes server-side session cookies.
 * Prevents open redirect attacks by enforcing relative destination paths.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "email" | "signup" | "recovery" | "invite" | null;
  const rawNext = searchParams.get("next") || "/student/dashboard";

  // Sanitize next parameter: Must be a relative path, never protocol-relative or external
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/student/dashboard";

  if (token_hash && type) {
    try {
      const supabase = await getServerSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash
      });

      if (!error && data?.session) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }

      console.error("[AUTH_CALLBACK_ERROR] verifyOtp failed:", error?.message);
    } catch (err) {
      console.error("[AUTH_CALLBACK_EXCEPTION] Exception in auth callback:", err);
    }
  }

  // Redirect to student login with error query param on failure
  return NextResponse.redirect(new URL("/student/login?error=auth_callback_failed", origin));
}

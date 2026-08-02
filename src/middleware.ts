import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;

  // Extract and normalize user role
  const rawRole = (user?.user_metadata?.role as string | undefined)?.toLowerCase().trim();
  const isStudent = rawRole === "student";
  const isAdministrator = rawRole === "administrator" || rawRole === "admin";
  const isInternalUser = !isStudent;

  // ── Single Authoritative Setup & Route Decision for Non-API Requests ──────
  if (!pathname.startsWith("/api")) {
    let isSystemInitialized = false;

    try {
      const { data: config } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "initialization")
        .maybeSingle();

      if (config?.value) {
        isSystemInitialized = Boolean(
          (config.value as { is_initialized?: boolean })?.is_initialized
        );
      }
    } catch {
      isSystemInitialized = false;
    }

    // ── CASE A: No Administrator Exists (System Uninitialized) ─────────────
    if (!isSystemInitialized) {
      if (pathname !== "/setup") {
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
      return response;
    }

    // ── CASE B: Administrator Exists (System Initialized) ───────────────────
    // 1. Block access to /setup if system is initialized
    if (pathname === "/setup") {
      url.pathname = user ? (isStudent ? "/student/dashboard" : "/dashboard") : "/login";
      return NextResponse.redirect(url);
    }

    // 2. Authoritative Root "/" Request Handling
    if (pathname === "/") {
      if (user) {
        url.pathname = isStudent ? "/student/dashboard" : "/dashboard";
      } else {
        url.pathname = "/login";
      }
      return NextResponse.redirect(url);
    }
  }

  // ── Administrator-Only Route Guards ───────────────────────────────────────
  const adminOnlyPaths = ["/dashboard/health", "/reports/audit", "/settings"];

  if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    } else if (!isAdministrator) {
      url.pathname = "/dashboard";
      url.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(url);
    }
  }

  // ── Protected Staff/Admin Routes ──────────────────────────────────────────
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/monitoring")
  ) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    } else if (!isInternalUser) {
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── Student Portal Routes ──────────────────────────────────────────────────
  if (
    pathname.startsWith("/student/dashboard") ||
    pathname.startsWith("/student/upload")
  ) {
    if (!user) {
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    } else if (isInternalUser && !pathname.startsWith("/dashboard")) {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── Prevent Authenticated Users from Visiting Login Pages ──────────────────
  if (user && (pathname === "/login" || pathname === "/student/login")) {
    url.pathname = isStudent ? "/student/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Security Headers ───────────────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://*.supabase.co;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-src 'self' https://challenges.cloudflare.com;
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

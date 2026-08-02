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

  // ── Initial Setup Gating (Database Source of Truth) ─────────────────────────
  // Non-API routes verify if the application has been initialized.
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

    // Case A: System is UNINITIALIZED (0 Administrators exist)
    if (!isSystemInitialized) {
      if (pathname !== "/setup") {
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
    } else {
      // Case B: System is INITIALIZED (Administrator exists)
      if (pathname === "/setup") {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  // ── Helper: extract and normalize role from user metadata ──────────────────
  const rawRole = (user?.user_metadata?.role as string | undefined)?.toLowerCase().trim();
  const isStudent = rawRole === "student";
  const isAdministrator = rawRole === "administrator" || rawRole === "admin";
  // Non-student users (admin, staff, or accounts without role set) default to internal workspace access
  const isInternalUser = !isStudent;

  // ── Administrator-only routes ───────────────────────────────────────────────
  const adminOnlyPaths = [
    "/dashboard/health",
    "/reports/audit",
    "/settings",
  ];

  if (adminOnlyPaths.some(p => pathname.startsWith(p))) {
    if (!user) {
      if (pathname !== "/login") {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    } else if (!isAdministrator) {
      if (pathname !== "/dashboard") {
        url.pathname = "/dashboard";
        url.searchParams.set("unauthorized", "1");
        return NextResponse.redirect(url);
      }
    }
  }

  // ── General authenticated Staff/Admin routes ────────────────────────────────
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
      if (pathname !== "/login") {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    } else if (!isInternalUser) {
      if (pathname !== "/student/dashboard") {
        url.pathname = "/student/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  // ── Student Portal Routes ───────────────────────────────────────────────────
  if (
    pathname.startsWith("/student/dashboard") ||
    pathname.startsWith("/student/upload")
  ) {
    if (!user) {
      if (pathname !== "/student/login") {
        url.pathname = "/student/login";
        return NextResponse.redirect(url);
      }
    } else if (isInternalUser && !pathname.startsWith("/dashboard")) {
      // If internal staff accidentally lands on student dashboard, route them to staff dashboard
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── Prevent authenticated users from visiting setup or login pages ────────
  if (user && (pathname === "/login" || pathname === "/student/login" || pathname === "/setup")) {
    url.pathname = isStudent ? "/student/dashboard" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Security Headers ────────────────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // CSP for production (allows Supabase, Turnstile, and essential assets)
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

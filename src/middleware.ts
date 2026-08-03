import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // ── Single Authoritative Setup & Auth Routing Authority for Non-API Requests ──
  if (!pathname.startsWith("/api")) {
    let isDbInitialized = false;
    let hasAdminUser = false;

    // 1. Read system_config.initialization flag
    try {
      const { data: config } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "initialization")
        .maybeSingle();

      if (config?.value) {
        isDbInitialized = Boolean(
          (config.value as { is_initialized?: boolean })?.is_initialized
        );
      }
    } catch {
      isDbInitialized = false;
    }

    // 2. Determine whether a valid Administrator exists in auth.users using Service Role Client on server
    if (serviceRoleKey) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
        if (!error && users) {
          hasAdminUser = users.some((u) => {
            const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
            return role === "administrator" || role === "admin";
          });
        }
      } catch {
        hasAdminUser = false;
      }
    }

    // 3. System Initialized Decision:
    // System Initialized = (initialization flag == true) AND (administrator exists)
    const isSystemInitialized = isDbInitialized && hasAdminUser;

    // ── CASE A & B: System Uninitialized OR Recovery Mode (No Admin Exists) ──
    if (!isSystemInitialized) {
      if (pathname !== "/setup") {
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
      return response;
    }

    // ── CASE C: System Fully Initialized (Admin Exists & Flag is True) ────────
    // 1. Permanently disable /setup
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

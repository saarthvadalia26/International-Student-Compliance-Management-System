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

  // ── Helper: extract and normalize role from user metadata ──────────────────
  const rawRole = (user?.user_metadata?.role as string | undefined)?.toLowerCase().trim();
  const isAdministrator = rawRole === "administrator" || rawRole === "admin";
  const isInternalUser = rawRole === "administrator" || rawRole === "admin" || rawRole === "staff";

  // ── Administrator-only routes ───────────────────────────────────────────────
  // These routes require the Administrator role. Unauthenticated users are
  // redirected to /login. Authenticated non-admin users are redirected to /dashboard.
  const adminOnlyPaths = [
    "/dashboard/health",
    "/reports/audit",
    "/settings",
  ];

  if (adminOnlyPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!isAdministrator) {
      url.pathname = "/dashboard";
      url.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(url);
    }
  }

  // ── General authenticated Staff/Admin routes ────────────────────────────────
  if (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/students") ||
    request.nextUrl.pathname.startsWith("/compliance") ||
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/reminders") ||
    request.nextUrl.pathname.startsWith("/reports") ||
    request.nextUrl.pathname.startsWith("/monitoring")
  ) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!isInternalUser) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Student Portal Routes ───────────────────────────────────────────────────
  if (
    request.nextUrl.pathname.startsWith("/student/dashboard") ||
    request.nextUrl.pathname.startsWith("/student/upload")
  ) {
    if (!user) {
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Prevent authenticated users from visiting login pages ──────────────────
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/student/login")) {
    const role = user.user_metadata?.role;
    if (role === "student") {
      url.pathname = "/student/dashboard";
    } else {
      url.pathname = "/dashboard";
    }
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

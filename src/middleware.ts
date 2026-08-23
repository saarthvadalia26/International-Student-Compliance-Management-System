import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { administratorDetectionService } from "@/services/auth/administrator-detection.service";
import { isStudentPortalTestMode } from "@/config/feature-flags";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // ── Student Portal Test Mode Bypass ────────────────────────────────────────
  if (isStudentPortalTestMode()) {
    // Redirect root /student or /student/login directly to /student/dashboard
    if (pathname === "/student" || pathname === "/student/" || pathname === "/student/login") {
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }
    // Allow all other /student/* subroutes to render cleanly without authentication redirects
    if (pathname.startsWith("/student/")) {
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      return response;
    }
  }

  // ── Single Authoritative Setup & Auth Routing Authority for Non-API Requests ──
  if (!pathname.startsWith("/api")) {
    const detectionState = await administratorDetectionService.detectAdministratorState();

    // Case 2: No Administrator Exists OR Recovery Mode Required
    if (!detectionState.administratorExists) {
      if (pathname !== "/setup") {
        url.pathname = "/setup";
        return NextResponse.redirect(url);
      }
      return response;
    }

    // Case 1: Administrator Exists & System Initialized
    if (pathname === "/setup") {
      url.pathname = user ? (isStudent ? "/student/dashboard" : "/dashboard") : "/login";
      return NextResponse.redirect(url);
    }

    // Authoritative Root "/" Request Handling
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
    } else if (isStudent) {
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── Student Portal Routes (Production Mode) ─────────────────────────────────
  if (
    pathname.startsWith("/student/dashboard") ||
    pathname.startsWith("/student/profile") ||
    pathname.startsWith("/student/settings") ||
    pathname.startsWith("/student/history") ||
    pathname.startsWith("/student/notifications") ||
    pathname.startsWith("/student/efrro") ||
    pathname.startsWith("/student/upload")
  ) {
    if (!user) {
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    } else if (!isStudent) {
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { administratorDetectionService } from "@/services/auth/administrator-detection.service";

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
  const isAdministrator = rawRole === "administrator" || rawRole === "admin";

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
      url.pathname = user ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // Authoritative Root "/" Request Handling
    if (pathname === "/") {
      url.pathname = user ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Administrator-Only Route Guards ───────────────────────────────────────
  const adminOnlyPaths = [
    "/dashboard/health",
    "/monitoring",
    "/reports",
    "/reminders",
    "/settings",
    "/students/import"
  ];

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
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/reminders") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/help")
  ) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // ── Prevent Authenticated Users from Visiting Login Page ──────────────────
  if (user && pathname === "/login") {
    url.pathname = "/dashboard";
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

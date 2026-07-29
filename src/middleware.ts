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

  // Protect Staff Routes (App)
  if (request.nextUrl.pathname.startsWith("/dashboard") || 
      request.nextUrl.pathname.startsWith("/students") ||
      request.nextUrl.pathname.startsWith("/compliance") ||
      request.nextUrl.pathname.startsWith("/settings") ||
      request.nextUrl.pathname.startsWith("/profile")) {
    
    if (!user) {
      // Redirect to staff login
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect Student Portal Routes
  if (request.nextUrl.pathname.startsWith("/student/dashboard") ||
      request.nextUrl.pathname.startsWith("/student/upload")) {
    
    if (!user) {
      // Redirect to student login
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    }
  }

  // Prevent authenticated users from visiting login pages
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/student/login")) {
    const role = user.user_metadata?.role;
    if (role === "student") {
      url.pathname = "/student/dashboard";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Inject Security Headers
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

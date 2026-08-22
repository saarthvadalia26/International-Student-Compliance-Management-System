import { headers } from "next/headers";

/**
 * Sanitizes a URL string by trimming whitespace and trailing slashes,
 * and ensuring an explicit protocol prefix.
 */
export function sanitizeBaseUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, "");
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Resolves the application base URL from environment variables, deployment metadata,
 * or browser location when running outside of an active HTTP request context.
 * 
 * Hierarchy:
 * 1. NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL (User override)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel canonical production domain)
 * 3. VERCEL_URL (Vercel branch / preview deployment domain)
 * 4. Client-side window.location.origin
 * 5. Localhost fallback (development only)
 */
export function getEnvironmentAppUrl(): string {
  // 1. Explicit configured URL
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl?.trim()) {
    return sanitizeBaseUrl(explicitUrl);
  }

  // 2. Vercel Production domain (e.g. iscms.vercel.app)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return sanitizeBaseUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`);
  }

  // 3. Vercel Preview / Branch deployment domain (e.g. iscms-git-develop-v020.vercel.app)
  if (process.env.VERCEL_URL?.trim()) {
    return sanitizeBaseUrl(`https://${process.env.VERCEL_URL.trim()}`);
  }

  // 4. Client-side browser execution
  if (typeof window !== "undefined" && window.location?.origin) {
    return sanitizeBaseUrl(window.location.origin);
  }

  // 5. Local development fallback
  return "http://localhost:3000";
}

/**
 * Dynamically resolves the authoritative request origin.
 * When called inside Next.js Server Components, Server Actions, or Route Handlers,
 * it inspects active incoming request headers (x-forwarded-host, host, x-forwarded-proto).
 * If headers are unavailable, it falls back to environment-based resolution.
 */
export async function getRequestOrigin(fallbackUrl?: string | null): Promise<string> {
  if (fallbackUrl?.trim()) {
    return sanitizeBaseUrl(fallbackUrl);
  }

  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (host) {
      const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return sanitizeBaseUrl(`${proto}://${host}`);
    }
  } catch {
    // headers() throws if called outside a request context (e.g. background job, build time, or unit test)
  }

  return getEnvironmentAppUrl();
}

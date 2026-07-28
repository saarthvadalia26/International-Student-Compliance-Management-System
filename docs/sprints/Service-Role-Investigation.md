# Supabase Service Role Client Security Investigation

- **Status**: Completed & Certified
- **Security Incident Reference**: `[SECURITY_VIOLATION] Attempted to instantiate the administrative service role client in the browser.`
- **Release Version**: v1.0.0
- **Target Institution**: National Forensic Sciences University (NFSU)

---

## 1. Executive Summary

A security violation error was detected on the administration login page (`/login`), indicating an attempt to instantiate the Supabase Administrative Service Role client inside the browser execution context. 

The Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) grants administrative access that bypasses PostgreSQL Row-Level Security (RLS). Instantiating or exposing this client in browser JavaScript bundles presents a severe security risk.

This investigation identified the root cause leakage vectors, audited the entire codebase, implemented compile-time build guards via `server-only`, and refactored client authentication to use the browser anonymous client exclusively.

---

## 2. Root Cause Analysis

The investigation uncovered two distinct execution paths causing the security violation:

### Primary Violation: Client Component Direct Call
- **File**: `src/app/login/page.tsx`
- **Root Cause**: The login page component (`"use client"`) imported `getAdminSupabase` directly from `@/lib/supabase/admin` and called `const supabase = getAdminSupabase()` inside its credential submission handler.
- **Trigger**: When an administrator attempted to submit credentials, `getAdminSupabase()` ran inside the browser window context. The runtime defensive guard in `admin.ts` caught this violation and threw `[SECURITY_VIOLATION]`.

### Secondary Violation: Layout Hydration Transit Leak
- **File**: `src/app/layout.tsx` → `src/config/startup.ts`
- **Root Cause**: The Root Layout component invoked `initializeStartup()`, which called `verifyNotificationTableExists()`. This function statically imported `getAdminSupabase` from `@/lib/supabase/admin` and attempted to execute database table validation during client-side layout hydration.

---

## 3. Remediation & Architectural Protection

1. **Client Component Refactoring**: Refactored `src/app/login/page.tsx` to import and consume `getBrowserSupabase()` from `@/lib/supabase/browser`, which uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` and enforces Row-Level Security.
2. **Compile-Time Build Protection**: Added `import "server-only";` to `src/lib/supabase/admin.ts` and `src/lib/supabase/server.ts`. Any future attempt to import these modules into client-side React bundles will trigger a hard Next.js Turbopack compilation error.
3. **Runtime Execution Guard**: Updated `src/config/startup.ts` to guard `verifyNotificationTableExists()` with `if (typeof window !== "undefined") return;` and converted static `admin.ts` imports into server-only dynamic imports.
4. **Barrel File Isolation**: Refactored `src/lib/supabase/index.ts` to export browser-safe clients only, requiring server-side services to explicitly import from dedicated `@/lib/supabase/admin` or `@/lib/supabase/server` paths.

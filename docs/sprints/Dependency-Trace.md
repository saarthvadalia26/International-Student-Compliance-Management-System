# Service Role Client Browser Leakage Dependency Trace

- **Target Institution**: National Forensic Sciences University (NFSU)
- **Module**: Security & Authentication Infrastructure

---

## 1. Vulnerable Dependency Traces (Pre-Fix)

### Trace A: Login Form Execution Leak

```
[Browser Runtime Window Context]
  │
  ▼
src/app/login/page.tsx ("use client")
  │
  ├── import { getAdminSupabase } from "@/lib/supabase/admin"
  │     │
  │     ▼
  │   src/lib/supabase/admin.ts
  │     │
  │     └── getAdminSupabase()
  │           │
  │           ▼
  │         typeof window !== "undefined" Check
  │           │
  │           └── EXCEPTION THROWN: [SECURITY_VIOLATION]
```

### Trace B: Root Layout Hydration Leak

```
src/app/layout.tsx (Root Layout)
  │
  ├── initializeStartup()
  │     │
  │     ▼
  │   src/config/startup.ts
  │     │
  │     ├── import { getAdminSupabase } from "@/lib/supabase/admin" (Static)
  │     │
  │     └── verifyNotificationTableExists()
  │           │
  │           ▼ [Client Hydration Context]
  │         getAdminSupabase() -> EXCEPTION THROWN: [SECURITY_VIOLATION]
```

---

## 2. Hardened Dependency Traces (Post-Fix)

### Secure Client Trace A: Login Form Authentication

```
[Browser Runtime Window Context]
  │
  ▼
src/app/login/page.tsx ("use client")
  │
  ├── import { getBrowserSupabase } from "@/lib/supabase/browser"
  │     │
  │     ▼
  │   src/lib/supabase/browser.ts
  │     │
  │     └── Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS Protected)
  │           │
  │           └── SUCCESS: Client-Side Auth Flow
```

### Secure Server Trace B: Administrative Backend Services

```
Server Actions / Route Handlers / Cron Jobs (Node.js Server Runtime Only)
  │
  ├── import "server-only"  <-- Next.js Build Guard
  ├── import { getAdminSupabase } from "@/lib/supabase/admin"
  │     │
  │     ▼
  │   src/lib/supabase/admin.ts
  │     │
  │     └── Uses SUPABASE_SERVICE_ROLE_KEY (Server Only)
```

# Session Lifecycle & Management

- **Status**: Completed
- **Module**: Identity & Session Management

## Lifecycle Stages

### 1. Initialization (Login)
- The user submits an authentication request with an explicit email address.
- Supabase Auth validates the credentials.
- Upon success, `@supabase/ssr` establishes a session by writing `sb-[id]-auth-token` HttpOnly cookies to the browser, making the JWT invisible to client-side scripts.

### 2. Maintenance & Edge Protection
- Every navigation request passes through `src/middleware.ts`.
- The middleware reads the secure cookie and validates the session against Supabase.
- If the session is valid, the request proceeds. If the cookie is missing or the JWT has expired, the user is redirected gracefully to the `/login` portal.

### 3. Server-Side Execution (Server Actions)
- When interacting with database services, Server Actions invoke `getServerSupabase()`.
- The server client extracts the HttpOnly cookie, parses the JWT, and guarantees the database transaction executes strictly within the row-level security (RLS) constraints of the authenticated user.

### 4. Invalidation (Logout)
- The logout function invokes `supabase.auth.signOut()`.
- This destroys the session on the Supabase backend.
- The `ssr` client subsequently wipes all related cookies from the browser, enforcing a complete state purge, before redirecting to the login screen.

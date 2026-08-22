# Production Deployment & Verification Protocol

- **Status**: Approved
- **Release Baseline**: v0.2.0
- **Canonical Release Branch**: `main`

---

## 1. Production Release Checklist

Before releasing any version to Production:
1. [x] **Lint & Types**: `npm run lint` (0 errors), `npx tsc --noEmit` (0 errors).
2. [x] **Automated Tests**: All unit, integration, and domain test suites pass 100%.
3. [x] **Build Verification**: `npm run build` succeeds generating all static and dynamic routes.
4. [x] **Single Source of Truth Version**: Root `package.json` version matches target release (e.g. `0.2.0`).
5. [x] **Zero Localhost Leakage**: No hardcoded localhost fallback used in production auth redirects.
6. [x] **Git Merge to `main`**: Branch merged into `main` and tagged with `v0.X.X`.

---

## 2. Post-Deployment Production Verification Steps

Once Vercel finishes the production deployment on `main`:
1. **Public Landing / Staff Login**:
   - Navigate to `/login`.
   - Verify university branding, secure inputs, and successful authentication.
2. **Student Portal Login**:
   - Navigate to `/student/login`.
   - Verify "Continue to Portal" button redirects without navigating to localhost.
3. **Workspace Dashboard & Navigation**:
   - Verify `/dashboard` metrics, student list, and quick actions.
4. **System Health & Infrastructure Diagnostics**:
   - Navigate to `/settings?tab=system` or `/dashboard/health`.
   - Verify `App Version: v0.2.0`.
   - Verify Supabase PostgreSQL latency, Cloudflare R2 bucket connection, and runtime environment.

# Production Issues Log

- **Status**: Triaged
- **Action Required**: None currently blocking deployment.

## Issue Tracking Matrix

### Critical
*No critical issues detected.*
- The authentication bypass vulnerabilities were resolved in Sprint 11.
- The admin client leakage in Server Actions was patched in Sprint 12.

### High
*No high issues detected.*
- Rate limiting is managed at the Vercel Edge layer inherently.
- CSP and Secure Cookies are correctly orchestrated by Next.js and `@supabase/ssr`.

### Medium
- **M-01: Rate Limiting Sub-System**: While Vercel provides baseline DDoS protection, granular API-route level rate limiting (e.g., locking out an IP after 5 failed login attempts) relies heavily on Supabase Auth's internal GoTrue ratelimiter rather than custom application logic. This is acceptable for launch but should be documented.

### Low
- **L-01: Localization Completeness**: The Settings panel supports changing languages, but some hardcoded UI strings remain in `page.tsx` boundaries that bypass the i18n dictionaries.
- **L-02: Analytics Payload Size**: The Sentry SDK adds ~45kb to the initial JS payload, slightly affecting mobile TTI (Time to Interactive).

# Cloud Infrastructure Specifications

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Network Security & Storage Setup

*   **HTTP Security Headers**: Enforced via Next.js response filters:
    *   `Content-Security-Policy (CSP)`
    *   `Strict-Transport-Security (HSTS)`
    *   `X-Frame-Options: DENY`
    *   `X-Content-Type-Options: nosniff`
    *   `Referrer-Policy: strict-origin-when-cross-origin`
*   **Supabase Storage Private Buckets**:
    *   Document versions binaries are restricted under private storage objects.
    *   Access is granted exclusively using Signed Link URLs with strict, short expirations (e.g. 5 minutes).
    *   Maximum upload size validation is enforced at 15MB.

---

## 2. Production Cron Schedulers

We run daily scheduled functions executing:
*   **`ReminderEngine`**: Scans expiring student documents and queue compliance alerts.
*   **`ExpiredTokenCleanup`**: Deletes invalid or expired authentication tokens from database.
*   **`DocumentRetentionCleanup`**: Purges physical file objects exceeding retention configurations (e.g. 30 days post-verification).
*   **`QueueRetryProcessor`**: Retry failed notification attempts using exponential backoffs.

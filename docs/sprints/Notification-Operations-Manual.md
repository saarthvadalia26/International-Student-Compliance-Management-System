# Notification Operations Manual

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Environment Configurations & Credentials

Configure target variables for development, staging, or production. Do **not** commit keys to version control:

```bash
# General Providers Selection
EMAIL_PROVIDER=resend
WHATSAPP_PROVIDER=meta

# Resend Settings
RESEND_API_KEY=re_123456789

# Meta WhatsApp Cloud Settings
META_ACCESS_TOKEN=eaag_meta_wa_token
META_PHONE_NUMBER_ID=1092837465

# Rate Limits Constraints
EMAIL_LIMIT_PER_MINUTE=100
WHATSAPP_LIMIT_PER_MINUTE=60
```

---

## 2. Managing Failed Deliveries & Queue Retries

*   **Audit Tracking**: Errors are logged to the `delivery_logs` table.
*   **Failed Deliveries Dashboard**: If a notification reaches 3 retries, its state becomes `FAILED`. Admins can inspect failures at `/reports/notifications`.
*   **Manual Trigger Retry**: Administrators can clear retry counts and set status back to `QUEUED` to re-trigger failed items.

---

## 3. Scheduled Worker Cron Definitions

Ensure the following tasks are configured in your server scheduling environment (e.g. Vercel Cron or pg_cron):

*   **Reminder Scheduler**: Runs daily at 00:00 AM. Scans compliance dates and queues alerts.
*   **Queue Processor**: Runs every 1 minute. Resolves and sends queued alerts.
*   **Retry Processor**: Runs every 5 minutes. Re-evaluates queued alerts with backoff times.
*   **Token & Document Cleanups**: Runs weekly at Sunday 00:00 AM. Prunes expired tokens and processes document retentions.

# Operations & Incidents Runbook

- **Status**: Production-Ready / Certified
- **Release Version**: v1.0.0-RC1
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Outage Mitigation Procedures

If `/health` returns `503 Unhealthy` status:
1.  **Isolate Database**: Check database CPU/memory usage inside the Supabase dashboard.
2.  **Verify Gateway APIs**: Ping Resend Status and Meta status pages.
3.  **Check Env Configurations**: Confirm that environment variable changes didn't break runtime startups.

---

## 2. Cron Schedulers Trigger Log

*   **Reminder Engines**: Runs daily at 00:00. Checks expiring eFRRO and dispatches emails/WhatsApp alerts.
*   **Token Cleanups**: Runs daily at 01:00. Deletes expired upload tokens.
*   **Retention Cleanups**: Runs daily at 02:00. Purges physical file objects exceeding 30-day compliance windows.
*   **Retry Processors**: Runs hourly. Triggers retries for failed notification dispatches.

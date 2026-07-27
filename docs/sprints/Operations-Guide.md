# System Operations & Maintenance Guide

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Daily Operations Checklist

1.  **Monitor Health Probes**: Ensure `/health`, `/readiness`, and `/liveness` endpoints return `200 OK`.
2.  **Verify Schedulers Run**: Check the `scheduled_jobs` table inside the database to verify the daily Cron run finished successfully.
3.  **Review Failed Dispatches**: Scan the `notification_delivery_log` for failed status alerts. Bounces and retry states are logged automatically.
4.  **Confirm Retention Cleanup**: Inspect `retention_audit_log` to confirm that files exceeding the 30-day compliance window have been purged.

---

## 2. Dynamic Configurations Management

Administrators execute configurations via the **System Settings Dashboard**:
*   General settings updates immediately sync across client templates.
*   New languages are supported by inserting records to the `notification_templates` database table.
*   Branding color variations and accents propagate to CSS design tokens dynamically.

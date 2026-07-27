# Post-Deployment Maintenance Checklist

- **Target Institution**: National Forensic Sciences University (NFSU)
- **Release Version**: v1.0.0
- **Schedule**: Daily, Weekly, and Monthly Operational Routines

---

## 1. Daily Maintenance Tasks

- [ ] Check `/health` endpoint status to verify DB connection, storage access, and notification gateways.
- [ ] Review `notification_delivery_log` for failed status alerts or unexpected bounce rates.
- [ ] Confirm daily Cron execution of `ReminderEngine` and `DocumentRetentionCleanup`.

---

## 2. Weekly Maintenance Tasks

- [ ] Review `audit_log` for unusual PII unmasking patterns (`UNMASK_PII`).
- [ ] Inspect Supabase Storage bucket capacity and confirm retention purge jobs are executing smoothly.
- [ ] Monitor database query latencies and index performance metrics.

---

## 3. Monthly Maintenance Tasks

- [ ] Execute database backup restoration drill on staging environment.
- [ ] Verify SSL certificate validity and auto-renewal parameters for university domain (`nfsu-iscms.in`).
- [ ] Audit administrator user accounts and revoke access for departed personnel.

# Platform Maintenance Guide

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Scheduled Maintenance Cron Jobs

The serverless platform triggers execution routines daily:
*   **eFRRO Expiry Reminder Scan**: Evaluates student snapshots against reminder thresholds and dispatches notifications.
*   **Expired Upload Token Cleanup**: Purges expired secure tokens from the database.
*   **Document Retention Purge**: Deletes physical PDF binaries from storage bucket directories that are verified and older than 30 days.

---

## 2. Database Maintenance

*   **Index Rebuilding**: Re-index database columns (specifically B-Tree indexes on `expires_at`, `token_hash`, and document warning snapshots) to maintain sub-second query performance.
*   **Database Backups**: Confirm daily PostgreSQL dumps are executed and stored securely.
*   **SSL Certificates**: Automated renewal hooks verify that custom domains `nfsu-iscms.in` SSL certs are updated.

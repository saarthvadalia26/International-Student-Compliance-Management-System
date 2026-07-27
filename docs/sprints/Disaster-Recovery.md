# Disaster Recovery & Backup Plan

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 08 - Production Deployment & Operations
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Backup Strategies

### 1.1 Database Backups (Supabase PostgreSQL)
*   **Daily Backups**: Automated snapshots managed by Supabase, retained for 30 days.
*   **Point-in-Time Recovery (PITR)**: Enables database state recovery to any specific second in the past 7 days.
*   **Manual Dump**: Command execution for ad-hoc database exports:
    `supabase db dump --db-url "$DATABASE_URL" -f backup.sql`

### 1.2 Storage Assets Backups
*   Scheduled serverless functions mirror PDF files from the `passport-documents`, `visa-documents`, and `efrro-documents` buckets to a separate secure secondary AWS S3 backup bucket.

---

## 2. Disaster Recovery Checklist

- [ ] Step 1: Detect outage/corruption and verify alert logs.
- [ ] Step 2: Route users to `maintenance` error page.
- [ ] Step 3: Spin up a fresh Supabase database instance.
- [ ] Step 4: Restore database state using point-in-time recovery.
- [ ] Step 5: Synced document storage attachments.
- [ ] Step 6: Validate connectivity via `/health` diagnostics.
- [ ] Step 7: Transition system online.

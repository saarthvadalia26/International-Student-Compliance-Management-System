# Disaster Recovery & System Recovery Guide

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Automated Backups

*   **Database**: Automated snapshots managed by Supabase, retained for 30 days. Point-in-Time Recovery (PITR) is enabled.
*   **Storage**: Automated hourly mirroring syncs PDF documents from Supabase storage buckets to AWS S3 backup buckets.

---

## 2. Emergency Outage recovery

1.  **Detect Outage**: Monitoring tools notify teams on `/health` failures.
2.  **Display Maintenance Banner**: Activate a standard maintenance routing page inside Vercel redirection rules.
3.  **Restore Database**: Execute Point-in-Time recovery via Supabase Console to a clean timestamp before corruption.
4.  **Redeploy App**: Use git rollback if code changes triggered the failure:
    `git push origin <last_known_stable_commit>:main`
5.  **Verify Services**: Ping health status endpoints and route the application back online.

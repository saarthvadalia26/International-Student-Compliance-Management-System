# Sprint 10 - Production Deployment Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Hosting Environment Provisioning

*   **Server Layer**: Next.js Server Components and serverless routing handlers hosted on Vercel Enterprise.
*   **Database Layer**: Supabase PostgreSQL database instance with standard connection pooling.
*   **File Storage**: Supabase Storage with dedicated private buckets:
    *   `passport-documents`
    *   `visa-documents`
    *   `efrro-documents`

---

## 2. Release & Sync Strategy

1.  **Environment Variables validation**: Startup checking is executed synchronously.
2.  **Schema Syncing**: Apply SQL migration files inside release pipelines.
3.  **Active health monitors**: Setup uptime checking targeting `/health` and `/readiness` endpoints.

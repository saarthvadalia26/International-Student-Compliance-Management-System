# Final Deployment Registry & Manual

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Hosting Provisioning

*   **Hosting Provider**: Vercel Enterprise (Edge Serverless routing layer).
*   **Database Engine**: Supabase PostgreSQL AWS High-Availability cluster.
*   **Asset Storage**: Supabase storage buckets locked under private policies.
*   **Email Gateway**: Resend Business domain mailing routing.
*   **WhatsApp Gateway**: Meta developer console Phone API integration.

---

## 2. Release & Rollback Procedures

### 2.1 Release Pipeline Steps
1.  **Run Validations**: Check type checks (`npx tsc --noEmit`) and linter (`npm run lint`).
2.  **Compile Assets**: Execute production bundler (`npm run build`).
3.  **Sync Migrations**: Apply DB migrations (`supabase db push`).
4.  **Uptime checks**: Monitor endpoints `/health`, `/readiness`, `/liveness`.

### 2.2 Rollback Protocols
1.  Navigate to Vercel console -> Deployments.
2.  Select last stable deployment and click **Redeploy / Rollback**.
3.  Rollback database changes if needed by executing a clean dump restoration.

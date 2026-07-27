# Sprint 08 - Production Deployment Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 08 - Production Deployment & Operations
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Multi-Stage Environments

We segregate the deployment lifecycle into three stages:
1.  **Development**: Local configurations (using mock providers and local Supabase instance).
2.  **Staging**: Pre-production cloud replica (running on vercel/AWS, connected to staging Supabase).
3.  **Production**: High-availability isolated cloud setup (connected to production NFSU Supabase database).

---

## 2. Deployment Pipeline

The build-and-deploy pipeline executes the following checks:

```
[GitHub Push to main/release]
             │
             ▼
    [GitHub Actions Runner]
             │
             ├─► lint: npm run lint
             ├─► typecheck: npx tsc --noEmit
             ├─► compile build: npm run build
             │
             ▼ (If checks pass)
    [Cloud Deployment] ──► [Run DB Migrations (supabase db push)]
                       ──► [Deploy Serverless Functions]
                       ──► [Purge Cache]
```

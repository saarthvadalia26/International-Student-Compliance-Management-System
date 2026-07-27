# Production Deployment Operations Guide

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Gateway Registrations

### 1.1 Resend Email Integration
1.  Navigate to [Resend Dashboard](https://resend.com).
2.  Add and verify the target university domain: `nfsu.edu.in`.
3.  Configure SPF, DKIM, and DMARC DNS records inside your domain registry.
4.  Generate a production API key: `re_xxxxxxxxxxxx`. Add it to your hosting variables as `RESEND_API_KEY`.

### 1.2 Meta WhatsApp Business Cloud Integration
1.  Register an account inside [Meta Business Manager](https://business.facebook.com).
2.  Navigate to App Dashboard -> WhatsApp Setup.
3.  Verify your Phone Number ID and Phone Number.
4.  Create and submit Utility Message templates matching:
    *   Name: `efrro_expiry_alert`
    *   Language: `en` (English), `hi` (Hindi)
5.  Generate a permanent System User Token. Add it as `META_ACCESS_TOKEN`.

---

## 2. Platform Deployments

### 2.1 Supabase Setup
1.  Spin up a production database instance on Supabase.
2.  Execute database migrations in order: `supabase db push`.
3.  Enable Point-in-Time Recovery (PITR) inside Database settings.
4.  Apply Row-Level Security (RLS) policies on all tables.

### 2.2 Vercel / Cloud App Deploy
1.  Connect your GitHub repository to Vercel.
2.  Set environment variables under settings matching `Environment-Variables.md`.
3.  Deploy main branch.
4.  Configure `/health` readiness probes.

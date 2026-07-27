# Production Deployment Checklist

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 08 - Production Deployment & Operations
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Security Hardening Checklist

- [x] **Row-Level Security (RLS)**: Enforced on all student-facing database tables.
- [x] **Secure Startup**: Validation scripts fail server boot if administrative credentials are missing.
- [x] **Storage Policy**: Public access is disabled on document buckets; files require signed link tokens.
- [x] **Security Headers**: Configured Content Security Policy (CSP), HSTS, frame-ancestors, and browser safety headers.
- [x] **Input Validation**: Strictly checked inside Server Actions using schemas (Zod).

---

## 2. Infrastructure Checklist

- [x] Database indexes optimized for warning dates.
- [x] Custom domain `nfsu-iscms.in` SSL active.
- [x] Resend and Meta WhatsApp credentials added to Vercel/production settings.
- [x] Daily cron schedulers active.
- [x] Operations Health dashboard active.

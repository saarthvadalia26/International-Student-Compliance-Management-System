# Go-Live & Release Readiness Checklist

- **Status**: Production-Ready / Certified
- **Release Version**: v1.0.0-RC1
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Security & Compliance Go-Live Tasks

- [x] **Row-Level Security (RLS)**: Active on database schemas.
- [x] **SSL certificates**: HTTPS active on domain `nfsu-iscms.in`.
- [x] **MIME Type Validations**: Active on storage uploads verifying magic byte headers.
- [x] **Private Buckets**: Verified `passport-documents`, `visa-documents`, and `efrro-documents` require signed links.
- [x] **Secrets Isolation**: Confirm all production keys are in server environment variables.

---

## 2. Infrastructure & Gateways Tasks

- [x] Resend verified domain `nfsu.edu.in` DNS registers active.
- [x] Meta WhatsApp phone number templates approved.
- [x] Database migration files applied (`001_enable_extensions.sql` through `014_student_upload_tokens_revocation.sql`).
- [x] Uptime probe target `/health` returns status `healthy` with 200 OK responses.
- [x] Daily cron schedulers active.

# Environment Configurations Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 08 - Production Deployment & Operations
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Required Variables

The system startup validates the following environment variables:

| Variable Name | Required | Target Layer | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client & Server | Core database backend endpoint URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client & Server | Public Supabase anon client authorization token. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-Only | Administrative secret key for backend actions bypass. |
| `NEXT_PUBLIC_APP_URL` | Yes | Server-Only | Base application URL for secure student upload links. |

---

## 2. Notification Provider Settings

These are validated during provider resolution inside the factory:

*   `EMAIL_PROVIDER` — Provider identifier (e.g. `"resend"`, `"mock"`).
*   `RESEND_API_KEY` — Authorization token for Resend HTTP calls.
*   `WHATSAPP_PROVIDER` — Provider identifier (e.g. `"meta"`, `"mock"`).
*   `META_ACCESS_TOKEN` — Auth token for Meta Graph endpoints.
*   `META_PHONE_NUMBER_ID` — Target Phone ID for WhatsApp message templates.

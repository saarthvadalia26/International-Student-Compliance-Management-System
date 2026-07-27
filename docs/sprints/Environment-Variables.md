# Production Environment Variables Registry

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 10 - Production Integrations & Deployment
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. System Constants

Startup checks validate the following variables:

| Variable Name | Required | Context | Target Value |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client & Server | Production database REST endpoint url. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client & Server | Public Supabase anon client access key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-Only | Administrative secret key for backend actions bypass. |
| `NEXT_PUBLIC_APP_URL` | Yes | Server-Only | Base application domain url (`https://nfsu-iscms.in`). |

---

## 2. Gateways Integration Credentials

*   `EMAIL_PROVIDER`: Set to `"resend"` to enable production email dispatches.
*   `RESEND_API_KEY`: Authentication key for Resend REST API endpoints.
*   `WHATSAPP_PROVIDER`: Set to `"meta"` to enable production WhatsApp messages.
*   `META_ACCESS_TOKEN`: Long-lived access token for WhatsApp Business Account calls.
*   `META_PHONE_NUMBER_ID`: Unique ID targeting the university sending phone number.

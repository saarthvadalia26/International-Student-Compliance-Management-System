# Production Provider Integration Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Phase 2 (Production Providers)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Resend Email Integration

Emails are dispatched via HTTP POST requests to `https://api.resend.com/emails`:

### Request Payload mapping
*   **Headers**:
    *   `Content-Type: application/json`
    *   `Authorization: Bearer ${process.env.RESEND_API_KEY}`
*   **Body**:
    ```json
    {
      "from": "ISCMS NFSU <compliance@nfsu.edu.in>",
      "to": "student@email.com",
      "subject": "ISCMS Compliance Reminder Alert",
      "html": "..."
    }
    ```

### Error Code translation
*   `401 Unauthorized` -> `AuthenticationError`
*   `429 Too Many Requests` -> `RateLimitError`
*   `5xx Server Error` -> `ProviderUnavailableError`

---

## 2. Meta WhatsApp Cloud Integration

Templates are dispatched via HTTP POST requests to `https://graph.facebook.com/v17.0/${phoneId}/messages`:

### Request Payload mapping
*   **Headers**:
    *   `Content-Type: application/json`
    *   `Authorization: Bearer ${process.env.META_ACCESS_TOKEN}`
*   **Body**:
    ```json
    {
      "messaging_product": "whatsapp",
      "to": "cleaned_phone_number",
      "type": "template",
      "template": {
        "name": "efrro_expiry_alert",
        "language": { "code": "en" },
        "components": [
          {
            "type": "body",
            "parameters": [{ "type": "text", "text": "body_content" }]
          }
        ]
      }
    }
    ```

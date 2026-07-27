# Sprint 07 - Phase 2 Production Provider Architecture

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Phase 2 (Production Providers)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Concrete Production Implementations

Core notification dispatches are routed through two private APIs:
1.  **`ResendEmailProvider`**: Uses the Resend REST endpoints (via HTTPS fetch requests authorized with `RESEND_API_KEY`) to send styled HTML compliance emails containing action buttons and dynamic variable replacements.
2.  **`MetaWhatsAppProvider`**: Connects directly to the Meta WhatsApp Business Cloud APIs (using access tokens and Phone Number IDs) to submit pre-configured Utility message templates to the student's registered mobile number.

---

## 2. Decoupled Dependency Isolation

In accordance with strict Clean Architecture principles:
*   The `ReminderEngine` and `QueueProcessor` are **completely oblivious** to whether emails are dispatched by Resend, AWS SES, or SendGrid.
*   They call only the abstract `INotificationProvider` interface methods.
*   Singleton provider instances are managed and returned by `NotificationProviderFactory` mapping environment variables:

```
[QueueProcessor]
       │
       ▼ (Dispatches alerts through)
[INotificationProvider]
       ▲
       ├─ [ResendEmailProvider] (Selected if EMAIL_PROVIDER = 'resend')
       ├─ [MetaWhatsAppProvider] (Selected if WHATSAPP_PROVIDER = 'meta')
       └─ [MockNotificationProvider] (Default fallback in development)
```

# Final System Architecture Specification

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Domain Decoupling & Clean Architecture

The ISCMS system strictly isolates layers:

*   **Presentation / UI Layer**: Standard Next.js server components and client templates utilizing accessibility-compliant elements.
*   **Application Service Layer**: Orchestrates domain processes (e.g. `ReminderEngine`, `RetentionService`, `StudentPortalService`).
*   **Infrastructure / Data Layer**: Decoupled third-party service provider integrations resolved via factories:
    *   `SupabaseNotificationRepository` mapping notifications records.
    *   `ResendEmailProvider` & `MetaWhatsAppProvider` mapping notification dispatch actions.

---

## 2. Core Operational Flow

```
     [Scheduler Cron Job]
              │
              ▼ (Triggers)
      [ReminderEngine] ──► Query Expiring eFRRO Documents
                       ──► Resolve preferred language & template variables
                       ──► Create cryptographically secure token
                       ──► Insert notification into pending queue
              │
              ▼ (Processed by)
      [QueueProcessor] ──► Query Pending alerts (locked as processing)
                       ──► Fetch target singleton provider from factory
                       ──► Dispatch via Resend/Meta API
                       ──► Record execution latency and correlation UUID
```

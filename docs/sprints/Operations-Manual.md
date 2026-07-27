# Operations & Monitoring Manual

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 08 - Production Deployment & Operations
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Centralized Log Management

We capture and classify logs across the application stack:
*   **Application Logs**: Next.js server console streams captured by cloud providers (Vercel, AWS CloudWatch).
*   **Database logs**: Supabase PostgreSQL engine logs.
*   **Reminder Scheduler Logs**: Records in `scheduled_jobs` database logs table tracking start/finish timestamps, batch sizes, and exceptions.
*   **Notification logs**: Mapped inside `notification_delivery_log` tracking latency, error messages, and provider correlation UUIDs.

---

## 2. Health & Telemetry Metrics

Operations dashboards display health telemetry via endpoints:
*   **`/health`**: Full diagnostic reports (Database status, Storage bucket access, Email gateway latency, WhatsApp gateway reachability).
*   **`/readiness`**: Connection state validation for orchestration readiness probes.
*   **`/liveness`**: Simple server process pulse test.

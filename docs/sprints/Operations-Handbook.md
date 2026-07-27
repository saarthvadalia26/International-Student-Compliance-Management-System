# System Operations Handbook

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Routine System Auditing

To maintain institutional compliance standards:
1.  **Monitor Health Probes**: `/health` endpoint tracks DB latency, storage, and email/WhatsApp gateways.
2.  **Audit Logs Review**: Review daily audit records for administrator file downloads and configuration changes.
3.  **Confirm Scheduled Runs**: Check execution rows inside the `scheduled_jobs` table to verify reminder runs and cleanups.

---

## 2. Dynamic Settings Operations

Administrators manipulate configurations via settings tabs:
*   **Branding colors**: Customizable on the branding panels.
*   **Reminder Intervals**: Dynamic slider values immediately reconfigure reminder schedules without code adjustments.
*   **Multilingual previews**: Test templates translations rendering before publishing them live.

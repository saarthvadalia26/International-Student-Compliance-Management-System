# Sprint 09 - Administrative Architecture

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 09 - Administration & Configuration Module
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Clean Architecture Mapping

The configuration module is decoupled:

*   **View Layer**: `settings/page.tsx` renders form controls and dynamic preview containers.
*   **Action controllers**: Handles updates asynchronously with saving/success states using `AsyncActionButton`.
*   **Database Schema**: Configuration maps to dedicated tables:
    *   `retention_policies` (Document lifetimes)
    *   `notification_templates` (Multilingual template variables)
    *   `reminder_rules` (Reminder schedules)

---

## 2. Configuration Audit Trails

Every configuration edit writes records to audit trails:
*   **Retention Changes**: Tracked inside `retention_audit_log`.
*   **Application Actions**: Logged under `audit_logs` tracking the performing admin user ID, updated table key, timestamp, and details.
*   **Security Policies**: Passphrase modifications and session revocations log system event traces.

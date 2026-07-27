# Document Retention Policy Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Enterprise Notification Infrastructure
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Core Policy Rules

To protect student privacy and comply with national regulations, document files stored in the ISCMS are classified as temporary assets:

1.  **Retention Period**: After staff verifies and approves a renewed eFRRO certificate, the physical PDF binary is retained for a configurable period (**default: 30 days**).
2.  **Grace Period**: The duration between warning dispatch and absolute file deletion.
3.  **Physical File Deletion**: Exclusively the document asset stored in the private Supabase Storage bucket is deleted.
4.  **Metadata Preservation**: Database version registry row items, audit logs, verification histories, status states, and verification logs are **completely preserved** for audit traceability.
5.  **Exclusion Rules**: Under-review, pending verification (`verification_status = 'pending'`), or unverified documents must **never** be deleted.

---

## 2. Administrator Controls

Administrators configure retention period days and grace period offsets globally via the **System Settings** administration dashboard.
*   **eFRRO Default Configuration**:
    *   `retention_period_days` = 30
    *   `grace_period_days` = 0
*   **Storage Path Prefix**: `efrro/{student_id}/{year}/{version_uuid}.pdf`

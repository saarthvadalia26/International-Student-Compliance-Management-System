# Sprint 07 - Notification Engine (Phase 1)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Notification Engine (Phase 1)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Compliance Reminder Workflow

1.  **Exclusivity**: Only **eFRRO** documents trigger active compliance reminders. Passport and Visa records are compliance logs and do **not** trigger alerts.
2.  **Reminder Schedule Configs**:
    *   30 Days
    *   15 Days
    *   7 Days
    *   3 Days
    *   1 Day
3.  **Automatic Stop**: When a student uploads a renewed eFRRO PDF document, all pending scheduled reminders for that student are automatically updated to `CANCELLED` status.

---

## 2. Secure Upload Link Mechanism

Every eFRRO reminder dispatches a unique time-bound upload URL:
`https://student.nfsu-iscms.in/student/upload/{secure_token}`

*   **Single-use**: Immediately invalidated upon verification or document upload.
*   **Expiration**: Lifespan defaults to 7 days.
*   **Cryptographically Secure**: Generated using `crypto.randomBytes(32)` to prevent prediction attacks.
*   **Revocable**: Can be manually revoked by administrators setting `revoked_at` timestamp.

---

## 3. Database Specification

Verified mapping for the token storage:
*   **`student_upload_tokens`**:
    *   `id` UUID PRIMARY KEY
    *   `student_id` References `public.students(id)`
    *   `token_hash` UNIQUE
    *   `expires_at` B-Tree indexed
    *   `used_at` timestamp
    *   `revoked_at` timestamp

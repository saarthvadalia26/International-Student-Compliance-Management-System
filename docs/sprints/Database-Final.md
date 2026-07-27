# Final Database Schema Specification

- **Status**: Production-Ready / Certified
- **Role**: Lead Software Architect
- **Sprint**: Sprint 11 - Production Readiness & Final Hardening
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Table Definitions & Constraints

### 1.1 `students` & Snapshots
*   Primary database storage mapping international students academic profiles, passport reference indexes, visa indexes, and compliance statuses.
*   `student_snapshot` table caches statuses (`WARNING`, `COMPLIANT`, `EXPIRED`) per student to accelerate dashboard queries.

### 1.2 `passport_versions`, `visa_versions`, `efrro_versions`
*   Maintains document uploads history and staff verification tracking fields.
*   Constraints:
    *   `chk_expiry_after_issue`: Ensures expiry date > issue date.
    *   `chk_verification_status`: Restricts values to `pending`, `verified`, and `rejected`.
    *   `file_path` contains `[PURGED]` once document retention cleanup task executes.

---

## 2. Row-Level Security (RLS) Policy

All student portal data tables enforce strict isolation:
*   `CREATE POLICY student_isolation ON table_name FOR ALL TO authenticated USING (auth.uid() = user_id);`
*   Prevents cross-tenant leaks by rejecting requests targeting foreign UUID primary keys.

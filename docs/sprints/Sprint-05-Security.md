# Sprint 05 - Security Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Authorization & Row Level Security (RLS)

All database operations are mediated by Supabase PostgreSQL Row Level Security configurations.

### A. Reporting Admin Policy
Only authorized university compliance officers can run aggregated analytics queries.
```sql
-- Policies for student_snapshot reporting
CREATE POLICY select_reporting_snapshot ON public.student_snapshot
    FOR SELECT
    TO authenticated
    USING (
      -- Check role validation in user metadata
      (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'compliance_officer')
    );
```

### B. Export Access Controls
Export operations generate high network load and parse large PII collections.
*   **Security Boundary**: Exporters are run inside Server Actions that re-evaluate user authentication and roles prior to pulling data records.
*   **Audit Logging**: Every export request writes a record to the `audit_log` database table detailing:
    *   Administrator UID
    *   Timestamp
    *   Report Type
    *   Applied filters metadata (e.g. `school: "Engineering"`)
    *   File size and output format (CSV, PDF, etc.)

---

## 2. PII Data Masking Policy

To comply with privacy standards, report tables mask highly sensitive fields by default:
*   Passport numbers, visa IDs, and eFRRO reference keys display only the last 4 digits (e.g. `******AB12`), unless the administrator explicitly requests decryption/unmasking (which triggers an audit trace).
*   Document PDF downloads generate short-lived, signed URLs (expiring in 5 minutes) to ensure that URLs cannot be leaked or shared.

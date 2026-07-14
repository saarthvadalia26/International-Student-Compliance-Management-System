# Sprint 05 - Phase 1 Implementation Walkthrough

This walkthrough details the construction of the Reporting and Analytics backend module, database optimizations, and exporters engine.

---

## 1. Files Created
*   **[007_reports_audit.sql](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/supabase/migrations/007_reports_audit.sql)**: Created the `audit_log` table, added cache fields to `student_snapshot` (passport_number, visa_number, efrro_number, days_until_efrro_expiry), and configured optimized indices.
*   **[index.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/types/index.ts)**: Configured types definitions mapping reports filters, paginated results, and model rows.
*   **[dto/index.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/dto/index.ts)**: Set up pagination and export input payloads.
*   **[validators/index.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/validators/index.ts)**: Implemented Zod validators to parse request filters.
*   **[mappers/index.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/mappers/index.ts)**: Implemented DB-to-Domain transformers.
*   **[report.repository.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/repositories/report.repository.ts)**: Built DB access queries using getAdminSupabase() for security.
*   **[report.service.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/services/report.service.ts)**: Orchestrated paginated retrieval logic, storage signed URLs creation, and download exports.
*   **[exporters.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/services/exporters.ts)**: Formatted tabular columns to standard CSV and HTML-based Excel formats, applying default PII masking.

---

## 2. Architecture Details
```
Domain Layer: /src/domain/reports/
 ├── [types/index.ts]       (Type definitions)
 ├── [dto/index.ts]         (Data input wrappers)
 ├── [mappers/index.ts]     (Data model mapping)
 ├── [validators/index.ts]  (Filter validators)
 ├── [repositories/]        (Database access layer)
 └── [services/]            (Business logic and exporters)
```

---

## 3. Database Optimizations & Indexes
*   Extended cache snapshots to store the active document numbers, eliminating slow database JOIN scans.
*   Created composite indexes on `registration_number`, `passport_number`, `visa_number`, `efrro_number`, `email`, and `days_until_efrro_expiry`.

---

## 4. Security Implementation
*   **Authorization**: Execution occurs strictly server-side using service role keys.
*   **Audit logs**: Automatically inserts logs of actions (e.g. `EXPORT_CSV`, `EXPORT_EXCEL`) to the `audit_log` table.
*   **Masking**: Document numbers are masked by default (e.g. `******5678`).
*   **Storage Access**: Document links generate short-lived (5-minute) signed URLs.

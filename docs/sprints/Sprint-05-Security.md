# Sprint 05 - Security Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Export Security Boundary

Export operations parse large volumes of Personally Identifiable Information (PII). To prevent data leaks:
*   **Server-Only Execution**: Exporters (`CsvExporter`, `ExcelExporter`) run exclusively within Server Actions on the server. Data payloads never touch the client DOM before being compiled into binary blobs.
*   **Active Authorization**: The Server Action re-validates the user session and metadata claims before querying database interfaces.
*   **Audit Logging**: Every report download writes a persistent record to the `audit_log` database table:
    *   Administrator UID
    *   Timestamp
    *   Report Type
    *   Applied filters metadata (e.g. `school: "Engineering"`)
    *   File size and output format (CSV, PDF, etc.)

---

## 2. PII Masking Policies

To comply with international privacy regulations, report lists and search results mask document identifiers by default:
*   **Identifier Masking**: Passport numbers, visa IDs, and eFRRO reference numbers are masked (e.g., `******AB12`), displaying only the last 4 characters, unless the compliance officer has explicitly requested unmasking.
*   **Signed Storage Linkages**: Documents links shown on tables do not expose actual Supabase Storage bucket URLs. Instead, they fetch short-lived signed URLs (valid for 5 minutes).

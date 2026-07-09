# Sprint 05 - Task Breakdown Specification (V2)

- **Status**: Revised & Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics
- **Revision Note**: Conforms task items to the eFRRO-only notification rule settings.

---

## 1. Task Assignments List

The following breakdown specifies implementation targets for development domains:

### A. Database Architect Tasks
*   `[ ]` Deploy database index configurations for `student_personal` and `student_snapshot` tables.
*   `[ ]` Configure RLS permissions allowing access controls on reports.
*   `[ ]` Deploy the `idx_notifications_efrro` partial index to optimize logging lookup operations.

### B. Backend Engineer Tasks
*   `[ ]` Implement `IReportRepository` contracts and mapping logic inside `SupabaseReportRepository`.
*   `[ ]` Code the statistics calculations logic for compliance percentages and monthly trends.
*   `[ ]` Verify that the `ReminderEngine` excludes Passport and Visa expiration logs from queue scheduling operations.
*   `[ ]` Implement CSV and Excel data exporters inside `export.service.ts`.
*   `[ ]` Create Next.js Server Actions checking credentials before executing data pulls.

### C. Frontend Engineer Tasks
*   `[ ]` Setup `/reports` layout structure.
*   `[ ]` Construct reports filtering layouts and inputs matching target parameters (academic year, school, courses, countries).
*   `[ ]` Code the analytics dashboard charts elements (Nationalities, expries, and trends timelines).
*   `[ ]` Develop accessible exports dropdown dialog actions.

### D. QA Engineer Tasks
*   `[ ]` Test filters combinations to verify data query outputs.
*   `[ ]` Run test cases verifying that Passport/Visa expirations do NOT schedule any notification queue tasks, while eFRRO expirations trigger reminders correctly.
*   `[ ]` Run load verification tests validating search response times with large mock datasets.

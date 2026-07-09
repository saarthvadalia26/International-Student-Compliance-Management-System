# Sprint 05 - Task Breakdown Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Task Assignments List

The following breakdown specifies implementation targets for development domains:

### A. Database Architect Tasks
*   `[ ]` Deploy database index configurations for passport/visa/efrro numbers and email/mobile lookups.
*   `[ ]` Configure table indexing for `days_until_efrro_expiry`.
*   `[ ]` Deploy security policy changes allowing aggregated analytics queries.

### B. Backend Engineer Tasks
*   `[ ]` Setup `/src/domain/reports/` with DTOs, mappers, repositories, services, types, and Zod validators.
*   `[ ]` Develop server-side Excel/CSV/PDF exporters and the audit logging mechanism.
*   `[ ]` Integrate dynamic token signing for storage document URLs.
*   `[ ]` Program user authentication verification steps in Server Actions.

### C. Frontend Engineer Tasks
*   `[ ]` Create `/src/features/dashboard/` and integrate the Recharts shared wrappers system.
*   `[ ]` Configure `/dashboard` page as the authenticated landing route view.
*   `[ ]` Develop `/reports` index panel and all 7 sub-report pages.
*   `[ ]` Build search debounced inputs and filters drawer panels.

### D. QA Engineer Tasks
*   `[ ]` Verify that no Passport or Visa alert entries enter the notifications queue.
*   `[ ]` Verify that unmasking actions are correctly logged in the audit trail.
*   `[ ]` Check Recharts responsiveness on various device breakpoints.

# Sprint 05 - Route Map Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Landing Page & Reports Navigation Map

The landing page of the application (after authentication) transitions from `/reports` to `/dashboard`. 

| Route Path | Scope / Content | Specific Route Permissions |
| :--- | :--- | :--- |
| `/dashboard` | Landing page. Displays metrics overview widgets, Recharts analysis trends, and compliance highlights. | Verified admin or compliance officer |
| `/reports` | Main reports directory index panel. | Verified admin or compliance officer |
| `/reports/students` | Detailed tabular report with search capabilities by student name, registration number, nationality, etc. | Verified admin or compliance officer |
| `/reports/passports`| Dedicated Passport verification lists and expiration logs. | Verified admin or compliance officer |
| `/reports/visas` | Dedicated Visa verification lists and status audits. | Verified admin or compliance officer |
| `/reports/efrro` | eFRRO verification items and registration checklists. | Verified admin or compliance officer |
| `/reports/compliance`| Aggregated status matrix mapping Expired, Expiring, Compliant, or Missing states. | Verified admin or compliance officer |
| `/reports/notifications` | Alert dispatches logging panel tracking delivery and retry status logs. | Verified admin or compliance officer |
| `/reports/audit` | Compliance verification actions, comments, and export audits history. | Admin scope only |

---

## 2. Dynamic Route Configurations & Query Parameters

Every sub-report route independently manages its search parameters. For example:

*   **`/reports/passports`**:
    *   `passportStatus`: Filters by `expired`, `valid`, or `missing`.
    *   `sortBy`: e.g. `passport_expiry_date`.
*   **`/reports/notifications`**:
    *   `notificationStatus`: Filters by `sent`, `failed`, `pending_retry`.
    *   `sortBy`: e.g. `scheduled_for`.
*   **Common parameters**: `page`, `limit`, `search`, `school`, `country`, `academicYear`.

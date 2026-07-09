# Sprint 05 - Route Map Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Route Map Declarations

All reporting pages are grouped under the `(app)` router segment to share layout headers:

| Route Path | View Type | Description |
| :--- | :--- | :--- |
| `/reports` | Dashboard Dashboard | General Analytics Dashboard displaying high-level compliance percentages, monthly expiry trend charts, and notification health indicators. |
| `/reports/students` | Detailed Table | Tabular report showing student metrics. Filterable by School, Country, and Academic Year. |
| `/reports/documents` | Detailed Table | Focuses on Passport, Visa, and eFRRO details. Enables sorting by expiry ranges and filtering by compliance state (Expired, Expiring Soon, Missing). |
| `/reports/notifications` | Detailed Table | Lists notification histories, trigger sources, delivery channels, and gateway retry records. |

---

## 2. Query Parameters Strategy

To ensure report state (search queries, active filters, page index, and sort order) is fully shareable, we will manage all list states via the Next.js search parameters pipeline. This allows bookmarking specific search views:

*   `page`: Page index offset number (Default: `1`)
*   `limit`: Page size parameter (Default: `50`)
*   `search`: Query text filtering by student name, registration number, or passport number.
*   `school`: Academic department filter key.
*   `country`: Country code filter matching nationalities.
*   `status`: Compliance standing status matching snap results.
*   `sortBy`: Columns target (e.g. `days_until_expiry`, `full_name`).
*   `sortOrder`: Sort direction (`asc`, `desc`).

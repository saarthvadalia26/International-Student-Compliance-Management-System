# Sprint 05 Architecture Revision Summary (V3 - Production Ready)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Summary of Changes

To transition Sprint 5 to a production-ready operational design, the architecture has been revised according to the following key decisions:
*   **Operational Dashboard Separation**: Split the landing view `/reports` into a dedicated operational `/dashboard` feature module (`src/features/dashboard/`), which acts as the post-login landing route.
*   **Independent Reporting Pages**: Removed the general `/reports/documents` route in favor of dedicated, isolated report views (students, passports, visas, eFRRO, compliance, notifications, audit).
*   **Recharts Charting Standard**: Standardized all graphical components on Recharts. Designed reusable chart wrappers, grids, accessibility wrappers, dynamic loaders, and loading/empty indicators.
*   **Strict Notification Scope**: Re-verified the eFRRO-only reminder engine scopes, ensuring passports and visas never dispatch WhatsApp/Email alerts.
*   **Comprehensive Domain Structure**: Expanded `src/domain/reports/` with DTOs, mappers, and Zod validators to keep the UI strictly logical and presentation-only.

---

## 2. Final Route Map

| Route Path | View Type | Specific Parameters / Filters |
| :--- | :--- | :--- |
| `/dashboard` | Dashboard Overview | Total/Compliant Students counts, eFRRO Expiry counts (30/15 days), Sent/Failed Alerts counts, Admissions and national charts. |
| `/reports` | Cards Directory | Navigation routes to sub-reports. |
| `/reports/students` | Detailed Table | Search name/reg, filters (School, Course, Gender, Nationality, category). |
| `/reports/passports`| Dedicated List | Search passport num, filters (School, Country, Status). |
| `/reports/visas` | Dedicated List | Search visa num, filters (School, Country, Status). |
| `/reports/efrro` | Dedicated List | Search eFRRO num, filters (School, Country, Status). |
| `/reports/compliance`| Status Grid | Search name/reg, filters (Compliance status, expiries). |
| `/reports/notifications` | Delivery logs | Search name, filters (Alert status, trigger source). |
| `/reports/audit` | Activity log | Filters (Action category, admin ID). |

---

## 3. Recharts Architecture Standard

To avoid charting duplication and preserve styling across dashboards, we establish the **Recharts Standard Wrapper Framework** under `src/features/dashboard/charts/`:

```
[ChartWrapper] (Injects ResponsiveContainer width="100%" height={350})
  ├── [ChartTheme] (Resolves colors using oklch-based standard palette variables)
  ├── [ChartTooltip] (Renders HTML tooltips with focus outline states)
  ├── [ChartLegend] (Maps WCAG compliant legend boxes)
  └── [ChartFallbackState] (Displays skeleton loaders or empty placeholders)
```

---

## 4. Notification & Auditing Security Updates

*   **eFRRO Limit Rules**: Notification logic evaluates **only** `document_type = 'efrro'`. Passport and Visa are compliance-only records.
*   **Export Security**: Exports run strictly server-side. Data files are written as buffer streams, and download events are captured directly in the SQL database `audit_log` table.
*   **Decryption Audits**: Sensitive parameters (Passport, Visa, and eFRRO reference IDs) are masked on the UI by default. Revealing or exporting raw numbers requires explicit administrator authorization, triggering an audit record.
*   **Signed Storage Linkages**: Uploaded document PDFs are private. Links are parsed into server-signed URLs (valid for 5 minutes).

---

## 5. Performance Strategy

*   **Database Indices**: Created queries indices matching:
    *   `registration_number` (Students table)
    *   `email` (Students table)
    *   `passport_number`, `visa_number`, `efrro_number` (Snapshot table)
    *   `days_until_efrro_expiry` (Snapshot table)
*   **materialized Snapshot View**: Direct read logic from `student_snapshot` materialized database rows.
*   **Streaming UI components**: Wrap charts and reports tables in `<Suspense>` loaders to render page shells instantly.

---

## 6. Implementation Readiness Assessment

*   **Code Quality**: Lints (`npm run lint`), type-checking (`tsc --noEmit`), and builds (`npm run build`) all pass with **0 errors and 0 warnings**.
*   **Architecture Integrity**: Design patterns align with Next.js App Router boundaries, Supabase RLS permissions, and Feature-based folder trees.
*   **NFSU Compliance**: Conforms perfectly to the business requirements of the National Forensic Science University (NFSU).

*The architecture is fully verified, synchronized with GitHub, and ready for code implementation.*

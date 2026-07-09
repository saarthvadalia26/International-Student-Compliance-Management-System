# Sprint 05 - Component Hierarchy Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Component Tree Layout

The following component structure organizes the Reporting user interface:

```
[ReportsPageLayout]
 ├── [ReportsNavigationHeader] (Tab-navigation between Dashboard, Student, Document, and Alert logs)
 ├── [DashboardView] (Visible at /reports)
 │    ├── [MetricsGrid]
 │    │    ├── [MetricsCard] (Total Students)
 │    │    ├── [MetricsCard] (Compliance %)
 │    │    ├── [MetricsCard] (Expiring Documents)
 │    │    └── [MetricsCard] (Failed Notifications)
 │    ├── [AnalyticsCharts]
 │    │    ├── [ExpiryTimelineChart] (Bar chart of upcoming expiries)
 │    │    ├── [CountryDistributionChart] (Pie/Donut chart of nationalities)
 │    │    └── [MonthlyExpiryTrendChart] (Line chart mapping trends over time)
 │    └── [RecentActivityFeed] (List scroll showing audit logs and alerts)
 │
 └── [ReportFilterTableView] (Visible at /reports/students, /reports/documents, etc.)
      ├── [FiltersToolbar]
      │    ├── [SearchInput] (With debounce helper)
      │    ├── [FiltersDrawerTrigger]
      │    │    └── [FiltersDrawer] (School, Course, Expiry Date Range, Nationality selectors)
      │    └── [ExportMenuButton] (Dropdown with Excel, CSV, PDF, Print targets)
      ├── [ActiveFiltersRow] (Displays closable badges of active filters)
      ├── [ReportTable] (Fully typed data table mapping results)
      │    └── [TableRow]
      │         ├── [ComplianceStatusBadge]
      │         └── [ActionMenuButton] (Inspect profile details, download PDFs)
      └── [PaginationFooter] (Select page size dropdown and previous/next page arrows)
```

---

## 2. Interaction Design Guidelines

*   **Filter Drawer**: Implemented using a side-slide sheet. Actions (e.g. "Apply Filters", "Reset all") refresh the Next.js query parameter scope, triggering Server Component updates.
*   **Debounced Search**: Text search inputs use a `300ms` debounce hook to prevent excessive database queries on every keystroke.
*   **Streaming UI States**: Report pages employ React Suspense limits. Tables display placeholder skeleton states while fetching database payloads from Supabase.
*   **Accessibility (a11y)**: Charts implement SVG titles and aria descriptions. Controls support full keyboard navigation.

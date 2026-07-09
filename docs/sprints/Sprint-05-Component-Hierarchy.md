# Sprint 05 - Component Hierarchy Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Component Tree Layout

The components tree isolates the dashboard feature module and structures reports:

```
[DashboardAppShell]
 ├── [DashboardNavigationHeader]
 ├── [DashboardLandingPage] (/dashboard)
 │    ├── [DashboardMetricsGrid]
 │    │    ├── [MetricWidgetCard] (Total Students)
 │    │    ├── [MetricWidgetCard] (Fully Compliant)
 │    │    ├── [MetricWidgetCard] (eFRRO Expiring 30/15 Days)
 │    │    ├── [MetricWidgetCard] (eFRRO Expired / Missing)
 │    │    └── [MetricWidgetCard] (Alerts Sent / Failed Today)
 │    └── [DashboardChartsPanel] (Uses Standard Recharts Wrappers)
 │         ├── [StudentsByCountryDonut]
 │         ├── [StudentsBySchoolBar]
 │         ├── [StudentsByCourseBar]
 │         ├── [efrroExpiryTimelineArea]
 │         ├── [MonthlyAdmissionsLine]
 │         ├── [ComplianceDistributionPie]
 │         └── [NotificationSuccessRatePie]
 │
 └── [ReportsIndexLayout] (/reports)
      ├── [ReportsDirectoryGrid] (Cards pointing to student, passport, visa, efrro, etc.)
      └── [IndividualReportView] (e.g. /reports/passports)
           ├── [ReportFiltersToolbar]
           │    ├── [SearchInput] (Debounced keyword input matching global parameters)
           │    ├── [FiltersDrawerButton]
           │    │    └── [FiltersDrawer] (Academic Year, School, Expiry, Arrival)
           │    └── [ExportDropdownActions] (Excel, CSV, PDF, Print triggers)
           ├── [ActiveFiltersDisplay]
           ├── [ReportTable]
           └── [PaginationFooter]
```

---

## 2. Recharts Reusable Component Design

To enforce visual and structural consistency, all charts must import the shared charts container components defined under `src/features/dashboard/charts/`:

*   **`ChartWrapper`**: Resolves layout margins, loading placeholder spinners, empty states, and injects `<ResponsiveContainer width="100%" height={350}>`.
*   **`ChartTooltip`**: Renders custom dark-themed tooltips with clean fonts and colors formatting:
    ```tsx
    const CustomTooltip = ({ active, payload, label }: TooltipProps) => { ... }
    ```
*   **`ChartLegend`**: Custom component mapping indicators that match NFSU's typography guidelines.
*   **`ChartTheme`**: Set of constant colors matching the institutional identity.

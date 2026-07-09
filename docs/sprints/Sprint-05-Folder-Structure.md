# Sprint 05 - Folder Structure Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Directory Tree Configuration

The Reporting feature follows the project's standard modular directory layout:

```
src/
├── app/
│   └── (app)/
│       ├── reports/
│       │   ├── page.tsx               # Analytics dashboard entry page
│       │   ├── students/
│       │   │   └── page.tsx           # Student general compliance report route
│       │   ├── documents/
│       │   │   └── page.tsx           # Expiries, passport, visa, & eFRRO reports
│       │   └── notifications/
│       │       └── page.tsx           # Alerts & delivery metrics reports
│       └── ...
├── domain/
│   └── reports/
│       ├── types/
│       │   └── index.ts               # Core model contracts & filter definitions
│       ├── repositories/
│       │   └── report.repository.ts   # IReportRepository interface & Supabase impl
│       └── services/
│           ├── report.service.ts      # ReportingService core business calculations
│           └── export.service.ts      # ExportEngine service with formatting handlers
└── features/
    └── reports/
        ├── components/
        │   ├── analytics-charts.tsx   # Dashboard charts (Country distribution, expiries)
        │   ├── metrics-grid.tsx       # Stats metrics cards panel
        │   ├── report-filters.tsx     # Reusable filters drawer & input elements
        │   ├── report-table.tsx       # Paginated reports display table
        │   └── export-button.tsx      # Export download triggers
        ├── constants/
        │   └── index.ts               # Filtering metadata selections config list
        └── hooks/
            └── useReportData.ts       # React hooks fetching backend summaries
```

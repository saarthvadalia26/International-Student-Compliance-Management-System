# Sprint 05 - Implementation Plan Specification (V2)

- **Status**: Revised & Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics
- **Revision Note**: Updates testing and phase goals to match the eFRRO-only notification business rules.

---

## 1. Phased Development Lifecycle

We will execute Sprint 5 in four sequential phases:

```
[Phase 1: DB & Repositories] -> [Phase 2: Services & Logic] -> [Phase 3: Front-End UI] -> [Phase 4: QA & Validate]
```

### Phase 1: Database & Repository Foundations (Days 1-3)
*   Deploy PostgreSQL indices in migrations to optimize keyword search.
*   Implement `IReportRepository` and verify that the metrics query counts all documents, while the notification log retrieval operates exclusively on `document_type = 'efrro'`.
*   Validate DB read operations against mock database seed records.

### Phase 2: Analytics calculations & Exporters (Days 4-6)
*   Develop the statistics engine (`ReportingService`) calculating compliance ratios.
*   Confirm that the scheduler tasks and reminder engine verify only `efrro` exproses, leaving Passport and Visa as compliance-only metadata points.
*   Implement `CsvExporter` and print layouts handlers inside `src/domain/reports/services/export.service.ts`.
*   Integrate audit logging triggers in Server Actions.

### Phase 3: Reporting Frontend Features (Days 7-10)
*   Create feature folders: `src/features/reports/components/`.
*   Develop the tabular filter layouts and dynamic analytics charts widgets.
*   Configure the page routes under `/reports/`.

### Phase 4: Quality Verification & Auditing (Days 11-12)
*   Validate type safety constraints (`tsc --noEmit`).
*   Confirm that no automated reminder triggers or templates are mapped to Passport or Visa documents.
*   Confirm zero layout violations or styling bugs on mobile viewports.
*   Generate final walkthroughs and release commits.

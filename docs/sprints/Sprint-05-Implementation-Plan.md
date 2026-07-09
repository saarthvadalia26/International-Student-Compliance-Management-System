# Sprint 05 - Implementation Plan Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Phased Development Lifecycle

We will execute Sprint 5 in five sequential phases:

```
[Phase 1: DB & Domain Layout] -> [Phase 2: Dashboard Feature] -> [Phase 3: Individual Reports] -> [Phase 4: Exporters & Audit] -> [Phase 5: Verification]
```

### Phase 1: Database Indices & Domain Structure (Days 1-3)
*   Deploy PostgreSQL indices in migrations to optimize keyword search matching passport, visa, and eFRRO numbers.
*   Setup domain structures: `/src/domain/reports/dto/`, `/mappers/`, `/repositories/`, `/services/`, `/types/`, `/validators/`.
*   Validate DB read operations against mock database seed records.

### Phase 2: Dashboard Feature Module & Recharts Standard (Days 4-6)
*   Create feature folder `/src/features/dashboard/`.
*   Configure the unified chart wrapper and the color palette variables.
*   Deploy `/dashboard` route as the application landing page.

### Phase 3: Route-Specific Reports UI (Days 7-9)
*   Develop individual reports under `/reports/students`, `/reports/passports`, `/reports/visas`, `/reports/efrro`, `/reports/compliance`, `/reports/notifications`, `/reports/audit`.
*   Configure dedicated page controls (paginated tables, sorting parameters, filter selectors).

### Phase 4: Server-Side Exporters & Auditing (Days 10-11)
*   Implement CSV, Excel, and PDF exporters.
*   Connect the audit logging Server Actions.
*   Test unmasking actions traces.

### Phase 5: Verification & Production Bundle Validation (Day 12)
*   Run lint (`npm run lint`), typescript (`tsc --noEmit`), and builds (`npm run build`).
*   Validate chart layout responsiveness on mobile browsers.

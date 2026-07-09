# Sprint 05 - Performance Strategy Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Data Scale Optimization (50,000+ Students)

### A. Materialized Compliance Snapshots View
To avoid heavy JOIN calculations across large document version history tables at query time, the `student_snapshot` table (created in Sprint 3) acts as a read-cache. 
*   **Update Triggers**: Database triggers update the snapshot record immediately whenever a document version status transitions to `verified`, `rejected`, or when a new version is uploaded.
*   **Outcome**: Reduces reporting dashboard load times from complex multiple-table JOIN operations down to a single read query.

### B. Keyset Pagination (Seek Method)
For export lists or very large reports, offset-based pagination (`OFFSET 10000`) becomes slow because PostgreSQL must read and discard rows. 
*   **Strategy**: Use keyset pagination using search markers where appropriate:
    ```sql
    SELECT * FROM public.student_personal
    WHERE full_name > :lastSeenName
    ORDER BY full_name ASC
    LIMIT 50;
    ```

---

## 2. Next.js App Router Loading Strategy

### A. React Server Components (RSC) and Streaming
1.  **Layout Streaming**: The reporting navigation framework renders instantly. Report tables are wrapped in React `<Suspense>` boundaries.
2.  **Streaming Table Rows**: Large datasets are streamed using chunked Server Actions, meaning users see page skeletons immediately and rows populate incrementally as data arrives.
3.  **Lazy Loading Charts**: Analytics charts are loaded dynamically on client-side client views using Next.js `dynamic()` imports to minimize the initial JS bundle size.
    ```typescript
    const ExpiryTimelineChart = dynamic(() => import("../components/analytics-charts").then(m => m.ExpiryTimelineChart), {
      ssr: false,
      loading: () => <Skeleton className="h-64 w-full" />
    });
    ```

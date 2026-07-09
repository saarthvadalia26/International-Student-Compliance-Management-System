# Sprint 05 - Risk Assessment Specification

- **Status**: Proposed
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Risk Analysis & Mitigation Matrix

The following matrix identifies potential technical risks during Sprint 5 execution along with their mitigation strategies:

| Risk Description | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **High Query Latency**: Multi-table JOIN queries matching various filters on 50,000+ students could cause database timeouts. | Medium | High | **1.** Direct query reads to the `student_snapshot` materialized table.<br>**2.** Build indexes on frequently filtered fields (`school`, `nationality_name`, `days_until_expiry`). |
| **Data Leakage in Exports**: sensitive student details could be leaked if PDF/CSV files are shared or cached publicly. | Low | Critical | **1.** Enforce service-role authorization checks in Server Actions before generating exports.<br>**2.** Mask document identifiers (Passport, Visa) by default.<br>**3.** Restrict access to uploaded files using short-lived signed URLs. |
| **Bundle Size Bloat**: Importing large charting libraries (e.g. Recharts, Chart.js) may slow down initial dashboard load times. | High | Medium | **1.** Use dynamic imports (`next/dynamic`) with SSR disabled for all dashboard chart components.<br>**2.** Lazy load charts only when they enter the viewport. |
| **Export Resource Exhaustion**: Exporting large PDF reports could exhaust server memory or block node worker loops. | Low | High | **1.** Stream datasets in chunks rather than loading all records into memory at once.<br>**2.** Enforce limit constraints (max 1,000 rows for detailed PDFs, encouraging CSV formats for larger exports). |

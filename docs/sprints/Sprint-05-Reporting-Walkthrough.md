# Sprint 05 - Reporting & Analytics - Implementation Walkthrough

This document outlines the final implementation of the Reporting & Analytics module for the International Student Compliance Management System (ISCMS) at the National Forensic Science University (NFSU).

---

## 1. Executive Summary

Sprint 05 establishes a secure, high-performance reporting system to monitor compliance status across 50,000+ international students. The primary business rules enforced during this phase are:
1. **eFRRO-Only Reminder Workflows**: Automated notifications are sent exclusively for eFRRO document expiries. Passports and Visas remain passive compliance status records.
2. **PII Data Security**: Sensitive identifiers (Passport, Visa, and eFRRO numbers) are masked by default. Administrative unmasking is performed via secure Server Actions and immediately logged for compliance auditing.
3. **Optimized Queries**: Direct caching via the `student_snapshot` materialized database entity to scale analytical operations with zero-overhead lookups.

---

## 2. Component Deliverables & Architecture

The reporting layer follows a strict Onion Architecture pattern dividing concerns into clean layers.

```
┌────────────────────────────────────────────────────────┐
│                   UI Router Pages                      │
│   /dashboard, /reports/students, /reports/efrro, ...    │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Server Actions                       │
│    (src/app/(app)/dashboard/actions.ts, reports/...)   │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Reporting Service                    │
│     (src/domain/reports/services/report.service.ts)    │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Repository Layer                      │
│   (IReportRepository / SupabaseReportRepository)       │
└────────────────────────────────────────────────────────┘
```

### Key Modules Implemented:
*   **Database Objects (`supabase/migrations/`)**: Added fields to `student_snapshot` caching Passport, Visa, and eFRRO numbers, and established search indexes. Created the `audit_log` table with tracking for action types, ip addresses, and user agents.
*   **Repository (`src/domain/reports/`)**:
    *   [IReportRepository](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/repositories/report.repository.ts): Interface contract outlining pagination and metric requirements.
    *   [SupabaseReportRepository](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/domain/reports/repositories/report.repository.ts): Concrete implementation executing optimized queries.
*   **Reporting Service (`src/domain/reports/services/`)**: Enforces validation parameters and formats data exports in CSV/Excel.
*   **UI Views (`src/app/(app)/`)**:
    *   `/dashboard`: Grid tracking KPI metrics with Recharts analytics.
    *   `/reports/students`: Filtering registries with dynamic search.
    *   `/reports/efrro`: Active tracking for upcoming expiries, featuring unmasking dialogs.
    *   `/reports/notifications`: Delivery tracing dashboard.
    *   `/reports/audit`: Audit trail tracking administrative access.

---

## 3. PII Auditing & Verification Flow

1. Administrative users request unmasked student identifiers.
2. Client Component triggers Server Action `unmaskIdentifier`.
3. Server Action verifies roles, records a `UNMASK_PII` audit log, and yields the unmasked value.
4. UI displays the value instantly in a secure session layout.

---

## 4. Verification & Validation Metrics

*   **Linter Checks (`npm run lint`)**: Clean execution, zero errors.
*   **TypeScript Compilations (`tsc --noEmit`)**: Clean execution, zero errors.
*   **Build Optimization (`npm run build`)**: Fully compiled and optimized production-ready bundle.

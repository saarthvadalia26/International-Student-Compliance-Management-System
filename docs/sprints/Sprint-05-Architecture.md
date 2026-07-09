# Sprint 05 - Reporting & Analytics Architecture Specification (V3)

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 5 - Reporting & Analytics

---

## 1. Modular Boundaries

To preserve strict SOLID and clean architecture guidelines:
*   **UI Views**: Rendered exclusively under `/src/app/(app)/dashboard` and `/src/app/(app)/reports`. Contains no SQL, Supabase clients, or raw query logic.
*   **Feature Modules**:
    *   `src/features/dashboard/`: Contains Recharts wrappers, dashboard widgets, and dashboard metrics hooks.
    *   `src/features/reports/`: Contains report-specific filters, tables, paginated controllers, and export actions.
*   **Domain Layers**:
    *   `src/domain/reports/`: Organized into:
        *   `dto/`: Data Transfer Objects for reports query inputs and outputs.
        *   `mappers/`: Transforms database row entities into domain reports interfaces.
        *   `repositories/`: `IReportRepository` contracts and Supabase client implementations.
        *   `services/`: Calculations logic for summaries and trends.
        *   `types/`: Types definition schemas.
        *   `validators/`: Zod filters validation checks.

---

## 2. Recharts Standard Specification

To prevent charts fragmentation across views, we establish a standardized charts framework using **Recharts**:

```typescript
// Shared Recharts configuration and styling constants
export const CHART_COLORS = {
  primary: 'oklch(0.205 0 0)',       // Dark dominant color
  success: 'oklch(0.627 0.265 150)', // Compliant green
  warning: 'oklch(0.795 0.184 65)',  // Expiring yellow/orange
  danger: 'oklch(0.577 0.245 27)',   // Expired red
  muted: 'oklch(0.708 0 0)',         // Grid line borders
  accent: 'oklch(0.97 0 0)'          // Tooltip backgrounds
};
```

*   **ResponsiveContainer**: Standardized height of `350px` (`h-96`) with full width behavior.
*   **Shared Tooltip**: Styled to support dark-mode colors using absolute positioning, customized labels formatting, and HTML overlay structures.
*   **A11y**: Every chart requires an SVG `title` element and `role="img"` to ensure screen readers can read chart labels.

---

## 3. Notification Scope

*   **eFRRO**: Operates all notification alerting mechanisms (Automatic pre-expiry warning reminders, WhatsApp/Email alert scheduling, delivery queue tracking, retry backoff engines).
*   **Passport / Visa**: Retains compliance status logic, dashboard counters, and report tables, but **never** schedules alerts or runs notification templates.

---

## 4. Operational Dashboard Widgets

The operational `/dashboard` overview (landing page after logging in) includes:

1.  **Total International Students**: Active students count.
2.  **Fully Compliant**: Verification complete for Passport, Visa, and eFRRO.
3.  **eFRRO Expiring (30 Days)**: Warnings count.
4.  **eFRRO Expiring (15 Days)**: Critical warnings count.
5.  **eFRRO Expired**: Number of expired records.
6.  **Missing eFRRO**: Registered students without an uploaded eFRRO document.
7.  **Notifications Sent Today**: Successful message transmissions.
8.  **Failed Notifications**: Errors logging count.

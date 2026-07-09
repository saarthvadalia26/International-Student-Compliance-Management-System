# Next.js Client Boundary Audit Report

- **Status**: Completed
- **Auditor**: QA/Frontend Engineer
- **Sprint**: Sprint 3 - Compliance Document Framework
- **Date**: 2026-07-08

---

## 1. Boundary Audit Summary

This report documents the review of the Next.js Server Component vs. Client Component boundaries within the Compliance feature module (`src/features/compliance/`). 

In Next.js App Router, the client boundary is established using the `"use client";` directive. Components *below* this boundary in the import tree are automatically treated as client-side code, meaning we do not need to add the `"use client";` directive to leaf components unless they are intended to be imported directly by Server Components in other contexts.

---

## 2. Component Auditing Breakdown

### A. Client Components (Marked with `"use client"`)

*   **[document-page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/document-page.tsx)**:
    *   *Directives*: `"use client";` (Present)
    *   *Reason*: Operates interactive state managers (`useState`) for modal visibilities and dynamic PDF source paths, and uses `useEffect` to trigger mock data simulation delays.
*   **[document-dialogs.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/document-dialogs.tsx)**:
    *   *Directives*: `"use client";` (Present)
    *   *Reason*: Houses form controls (input changes, textareas), tracks dirty form states (`window.confirm`), manages loading spinners, and emits sonner alerts (`toast`).

---

### B. Server/Agnostic Components (No `"use client"` directive)

The following components are stateless, rendering simple UI props. They remain Server Components (or client-agnostic):

*   **[compliance-status.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/compliance-status.tsx)**:
    *   *Reason*: Renders static status badges and remaining expiry labels based on incoming props.
*   **[document-card.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/document-card.tsx)**:
    *   *Reason*: Renders active document metadata. It triggers click callbacks passed by props but has no internal states.
*   **[document-history.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/document-history.tsx)**:
    *   *Reason*: Renders historical logs.
*   **[document-states.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/components/document-states.tsx)**:
    *   *Reason*: Renders empty, loading, or iframe PDF preview structures.
*   **[constants.ts](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/features/compliance/constants/constants.ts)**:
    *   *Reason*: A plain typescript data mapping config, containing no JSX or components.

---

### C. Page Routes (Server Components)

*   **[passport/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/(app)/students/[id]/passport/page.tsx)**
*   **[visa/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/(app)/students/[id]/visa/page.tsx)**
*   **[efrro/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/(app)/students/[id]/efrro/page.tsx)**

*   *Status*: Server Components.
*   *Audit Findings*: These pages do not import React hooks or call client browser APIs directly. Instead, they extract route parameters on the server side (using React `use(params)`) and pass the `studentId` and `documentType` down into the client-side `<ComplianceDocumentPage />`. 
*   *Evaluation*: **Highly Recommended Architecture**. Keeping page routes as Server Components ensures metadata generation, SEO titles, and static layout wrapper calculations remain optimized on the server, while interactive tasks are cleanly delegated to Client Component boundaries.

---

## 3. Recommendations
*   **Keep Boundaries Stable**: Ensure page routes remain Server Components. Do not add `"use client"` to the top-level route files.
*   **Leaf Component Reusability**: Do not add `"use client"` to leaf components like `compliance-status.tsx` or `document-card.tsx` as this preserves their capacity to be imported by other Server Components in the future.

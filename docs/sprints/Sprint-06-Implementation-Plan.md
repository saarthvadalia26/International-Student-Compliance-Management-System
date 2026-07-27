# Sprint 06 - Implementation Plan Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Technical Goals & Scope
Build a mobile-first Student Portal exclusively for NFSU international students to view compliance statuses, upload eFRRO PDF documents, track review history, and configure communication language preferences.

---

## 2. Phased Execution Plan

### Phase 1: Database & Migrations Setup
*   Define migration script `009_student_portal.sql` creating `student_upload_tokens`, `student_activity_log`, and `upload_audit_log` tables.
*   Configure indexes and references constraints linking to students database registry.

### Phase 2: Domain Layer Implementation
*   Create data structures in `src/domain/student-portal/types/index.ts`.
*   Implement `StudentPortalRepository` and matching `StudentPortalService` wrapping file validation and check constraints.

### Phase 3: Route Protection & Authentication Middleware
*   Implement Next.js student layout wrapper `src/app/student/layout.tsx` enforcing Supabase OTP role guards.
*   Setup token exchange action validation endpoints `/student/upload/[token]/page.tsx`.

### Phase 4: Student UI Views Integration
*   Develop student dashboard overview widgets, contact profile forms, history tables, and interactive drag-and-drop file uploaders under `/src/app/student/`.
*   Ensure full responsive CSS adaptabilities for mobile viewports.

# Sprint 02: Core Student Management Module

- **Status**: Approved
- **Owner**: Project Governance Board
- **Purpose**: Define the engineering commitments, architecture boundaries, deliverables, and acceptance criteria for Sprint 2.
- **Scope**: Implementation of the student registration, directory, profiles, editing, and validations. Excludes passport, visa, eFRRO, notifications, and analytics dashboards.
- **Dependencies**: Repository Foundation, Governance Pack, ADR-001, ADR-002, Database Design Specification (DDS), Database Implementation Plan (DIP), Sprint-01
- **Related Documents**: [Sprint-01.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-01.md), [Database-Design-Specification.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/database/Database-Design-Specification.md), [Database-Implementation-Plan.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/database/Database-Implementation-Plan.md)

## Table of Contents
1. [Overview](#overview)
2. [Detailed Guidance](#detailed-guidance)
3. [Acceptance Criteria & Definition of Done](#acceptance-criteria--definition-of-done)
4. [Deliverables Matrix](#deliverables-matrix)
5. [Risk Management & Mitigations](#risk-management--mitigations)
6. [Best Practices](#best-practices)
7. [Future Updates](#future-updates)
8. [Revision History](#revision-history)

## Overview
The goal of Sprint 2 is to build the Core Student Management foundation. This sprint focuses on developing the database schemas, services, and frontend interface controls necessary to register, search, view, and edit international student records. The implementation must follow a "Local Development First" model, establishing robust PostgreSQL schemas and type-safe TypeScript models before staging integrations.

---

## Detailed Guidance

### 1. Database Responsibilities (Database Architect Agent)
*   **Migrations**: Implement migrations strictly in the approved order:
    1.  `003_students.sql`: Create the `public.students` base identity table.
    2.  `004_student_details.sql`: Create child tables `student_personal`, `student_contact`, `student_academic`, `student_relationships`, and `student_embassy`.
*   **Attributes**: Enforce UUID v4 primary keys (ADR-001), VARCHAR parameters, date parameters, and strict JSONB payloads where appropriate.
*   **Constraints**:
    *   NOT NULL constraints on mandatory fields (registration number, full name, nationality, email).
    *   UNIQUE constraints on registration numbers and contact emails.
    *   CHECK constraints on status fields (students, academic standing, relationships) and date alignments (graduation date > admission date).
*   **Foreign Keys**: Enforce referential integrity linking profiles to `reference_data(code)` using RESTRICT delete policies.
*   **Exclusions**: Do not write schemas or migrations for passports, visas, eFRRO documents, or notifications.

### 2. Frontend Responsibilities (Frontend Engineer Agent)
*   **Components**: Build production-ready interactive pages:
    *   *Student Registration*: Form capturing biographical, academic, contact, and relationship data. Include progress steps.
    *   *Student Directory*: Table listing profiles with search input, academic filters, nationality filters, and paginated lists.
    *   *Student Details*: Profile layout showing structural data groups (academic tabs, contact card, relationship cards).
    *   *Student Edit*: Dialog or page layout updating existing records.
*   **UI Quality**: Implement dark mode support, responsive layouts (mobile/desktop views), loading states (skeleton components), empty states (AlertCircle placeholders), accessibility ARIA descriptors, focus outlines, and unsaved changes confirmation prompts.
*   **Exclusions**: Do not call remote Supabase APIs. Mock data structures must be used locally.

### 3. Backend Responsibilities (Backend Engineer Agent)
*   **Interface Layer**: Define Repository interfaces (`IStudentRepository`) and Service interfaces (`IStudentService`).
*   **DTOs**: Create TypeScript shapes representing validated request/response payloads (e.g. \`RegisterStudentDTO\`, \`UpdateStudentDTO\`).
*   **Validation Layer**: Implement strict Zod schemas matching database column constraints.
*   **CRUD Service**: Implement local CRUD logic, custom business exceptions, and structured console logs.
*   **Exclusions**: Do not integrate real database connection drivers or the Notification Engine.

### 4. QA Responsibilities (QA Engineer Agent)
*   **Reviews**: Audit migrations syntax, type parameters, component layouts, and Zod boundaries.
*   **Reports**: Generate a QA verification report, architecture alignment audit, risk assessment logs, and regression validations checklist.

---

## Acceptance Criteria & Definition of Done

### Acceptance Criteria
*   An administrator can successfully register a student with valid contact, academic, and relationship details.
*   Validation errors trigger immediately if input formats fail Zod checks or date alignments.
*   An administrator can search the directory via text search and filter by academic standing or compliance status.
*   All forms warn the user about unsaved edits on navigate-away attempts.
*   No SQL files contain triggers, RLS policies, or seed injections for tables other than `students` and detail entities.

### Definition of Done (DoD)
1.  All database migrations run and compile successfully without constraints errors.
2.  TypeScript checker compiles the project code with **0 errors**.
3.  Linter check (\`npm run lint\`) passes with **0 warnings and 0 errors**.
4.  Next.js production build (\`npm run build\`) builds the application successfully.
5.  QA reports are written and stored in the repository.
6.  The system architecture remains unchanged.

---

## Deliverables Matrix

| Team | Deliverable Name | File Path | Status |
| :--- | :--- | :--- | :--- |
| **Database** | Student Table Migration | `supabase/migrations/003_students.sql` | Planned |
| **Database** | Student Details Migration | `supabase/migrations/004_student_details.sql` | Planned |
| **Backend** | Student Repository Interface | `src/services/student/student.repository.ts` | Planned |
| **Backend** | Student Service Interface | `src/services/student/student.service.ts` | Planned |
| **Backend** | Student Validation Schemas | \`src/services/validation/student-validation.ts\` | Planned |
| **Frontend** | Student Registration Form | `src/app/(app)/students/add/page.tsx` | Planned |
| **Frontend** | Student Directory page | `src/app/(app)/students/page.tsx` | Planned |
| **Frontend** | Student Profile View | `src/app/(app)/students/[id]/page.tsx` | Planned |
| **QA** | Sprint 2 QA Compliance Report | `docs/sprints/Sprint-02-QA-Report.md` | Planned |

---

## Risk Management & Mitigations

*   **Risk 1**: Input format mismatch between Zod validation and database check constraints.
    *   *Mitigation*: Implement direct Zod validations using regex patterns and compile limits that match database configurations.
*   **Risk 2**: Hydration errors on client components when switching between light and dark modes.
    *   *Mitigation*: Wrap theme settings in React state configurations and load them only after the component mounts on the client.
*   **Risk 3**: Slow list rendering as mockup arrays expand.
    *   *Mitigation*: Implement page-level limit configurations and offset pagination controls.

---

## Best Practices
*   Apply the standard folder standard (App router, services division).
*   Enforce uppercase alphanumeric codes for academic program selections.
*   Keep database comments updated inside PostgreSQL schemas.

---

## Future Updates
*   Sprint 3 will cover passport, visa, and eFRRO immigration document tracking version tables.

---

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Project Governance Board | Initial Version Release |

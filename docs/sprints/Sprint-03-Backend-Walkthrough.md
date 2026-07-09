# Sprint 03 Backend Compliance Document Framework Walkthrough

- **Status**: Approved
- **Owner**: Backend Engineer
- **Purpose**: Summarize the design, implementation, business rules, and code validations of the reusable Compliance Document Framework backend module.
- **Scope**: Reusable domain models, Supabase storage hooks, generic repositories, validators, and services inside `src/domain/compliance/`.
- **Dependencies**: supabase/migrations/005_documents.sql
- **Related Documents**: [Sprint-03.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-03.md)

## Table of Contents
1. [Overview](#overview)
2. [Architecture Structure](#architecture-structure)
3. [Repository Layer](#repository-layer)
4. [Service Layer](#service-layer)
5. [Validation & Business Rules](#validation--business-rules)
6. [Verification Results](#verification-results)
7. [Revision History](#revision-history)

## Overview
This document walks through the reusable backend Compliance Document Framework designed during Sprint 3. The architecture generalizes Passport, Visa, and eFRRO workflows into a single framework, decoupling storage actions from business evaluation logic.

---

## Architecture Structure
The module lives inside `src/domain/compliance/` and conforms to Domain-Driven Design (DDD) principles:

*   **`types/`**: Houses model definitions (`student-snapshot.types.ts`) for documents, snapshots, statuses, and type helpers.
*   **`utils/`**: Declares custom exceptions (`document-errors.ts`) mapping business violations.
*   **`validators/`**: Enforces input safety via Zod schemas (`document.validator.ts`) for uploads, replacements, and verification checks.
*   **`mappers/`**: Encapsulates DB schema translation methods (`document.mapper.ts`) to avoid leaking raw table columns into the business logic.
*   **`repositories/`**: Declares `IComplianceDocumentRepository` and its implementation `SupabaseComplianceDocumentRepository` to query active records and history lists.
*   **`services/`**: Encapsulates storage services (`storage.service.ts`) and CRUD compliance logic (`document.service.ts`).

---

## Repository Layer
*   **`IComplianceDocumentRepository`**: Defines generalized methods to retrieve active documents, fetch version history, create new version rows, and upsert compliance snapshots.
*   **`SupabaseComplianceDocumentRepository`**: Implements the repository interface. It queries the respective tables (`passport_versions`, `visa_versions`, `efrro_versions`) dynamically based on parameters, preventing code duplication.

---

## Service Layer
*   **`IStorageService`**: Declares storage operations (upload, replace, delete, signed URL generation, and path checking).
*   **`SupabaseStorageService`**: Implements the storage interface. Uploads files to student-isolated folders (e.g. `student-documents/passport/[student_id]/`) and serves them via short-lived signed URLs.
*   **`ComplianceDocumentService`**: Coordinates document uploads and replacements. It depends strictly on `IStorageService` and `IComplianceDocumentRepository`, keeping business logic agnostic of the storage provider.
*   **`VerificationService`**: Updates the verification status ('verified', 'rejected') and triggers recalculations.
*   **`ComplianceStatusService`**: Implements the shared Compliance Status Engine. It maps active documents to one of the 6 standard compliance status options (`COMPLIANT`, `WARNING`, `EXPIRED`, `PENDING_VERIFICATION`, `REJECTED`, `MISSING`) and calculates student compliance scores.
*   **`SnapshotService`**: Refreshes the cached student compliance snapshot in `student_snapshot`.

---

## Validation & Business Rules
*   **Zod schemas**:
    *   `DocumentUploadSchema`: Validates document numbers, date alignment (expiry date must be after issue date), and file type/size (only PDF, max 2MB).
    *   `DocumentVerificationSchema`: Enforces that rejecting a document requires a valid rejection reason.
*   **Version History Rules**:
    *   Only one active version of a document type is permitted per student at any time. When a new version is created, older records are deactivated.
    *   Replacing a document generates a new audited version row with an incremented sequence number.

---

## Verification Results
*   **TypeScript Checks (`tsc --noEmit`)**: Completed with **0 errors**.
*   **Linter Checks (`npm run lint`)**: Completed with **0 errors/warnings**.
*   **Production Next.js Compiler Build (`npm run build`)**: Completed successfully.

---

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-08 | Backend Engineer | Initial Framework Walkthrough Release |

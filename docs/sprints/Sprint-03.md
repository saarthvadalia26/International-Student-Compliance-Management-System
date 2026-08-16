# Sprint 03: Compliance Document Framework

- **Status**: Approved
- **Owner**: Project Governance Board
- **Purpose**: Define the engineering requirements, responsibilities, deliverables, and quality criteria for Sprint 3.
- **Scope**: Reusable Compliance Document Framework supporting Passport, Visa, and eFRRO workflows. Includes database migrations, backend services, frontend dashboard panels, and storage architectures.
- **Dependencies**: Repository Foundation, Governance Pack, ADR-001, ADR-002, Sprint-01, Sprint-02, Database Design Specification (DDS), Database Implementation Plan (DIP)
- **Related Documents**: [Sprint-02.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/sprints/Sprint-02.md), [Database-Design-Specification.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/database/Database-Design-Specification.md), [Database-Implementation-Plan.md](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/docs/database/Database-Implementation-Plan.md)

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
The goal of Sprint 3 is to build the complete, reusable Compliance Document Framework. This framework serves as a core engine powering the management, versioning, verification, and expiry tracking of immigration documents (Passports, Visas, and eFRRO). By generalizing the backend services, schemas, and frontend card panels, the design eliminates code duplication and ensures that compliance scoring is computed consistently across all document types.

---

## Detailed Guidance

### 1. Database Scope (Database Architect Agent)
*   **Migrations**: Implement `supabase/migrations/005_documents.sql` inside a single transaction block.
*   **Versions Tables**: Create three tables following the versioning pattern (ADR-002):
    *   `passport_versions`
    *   `visa_versions`
    *   `efrro_versions`
    *   *Columns per table*:
        *   `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
        *   `student_id` UUID NOT NULL (FK referencing `students(id) ON DELETE CASCADE`)
        *   `version_number` INT NOT NULL DEFAULT 1
        *   `is_active` BOOLEAN NOT NULL DEFAULT TRUE (Only one active version per student/document type is permitted)
        *   `document_number` VARCHAR(100) NOT NULL
        *   `issue_date` DATE NOT NULL
        *   `expiry_date` DATE NOT NULL
        *   `file_path` TEXT NOT NULL (Relative path inside the private storage bucket)
        *   `verification_status` VARCHAR(20) NOT NULL DEFAULT 'pending' (CHECK status IN ('pending', 'verified', 'rejected'))
        *   `verified_by` UUID REFERENCES auth.users(id) ON DELETE SET NULL
        *   `verified_at` TIMESTAMPTZ DEFAULT NULL
        *   `rejection_reason` TEXT DEFAULT NULL
        *   `notes` TEXT DEFAULT NULL
        *   *Standard Audit Columns*: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`
*   **Compliance Snapshot**: Create table `student_snapshot` to cache compliance calculations:
    *   `student_id` UUID PRIMARY KEY REFERENCES `students(id) ON DELETE CASCADE`
    *   `passport_status` VARCHAR(25) NOT NULL DEFAULT 'MISSING' (CHECK status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING'))
    *   `passport_expiry` DATE DEFAULT NULL
    *   `visa_status` VARCHAR(25) NOT NULL DEFAULT 'MISSING' (CHECK status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING'))
    *   `visa_expiry` DATE DEFAULT NULL
    *   `efrro_status` VARCHAR(25) NOT NULL DEFAULT 'MISSING' (CHECK status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING'))
    *   `efrro_expiry` DATE DEFAULT NULL
    *   `compliance_score` INT NOT NULL DEFAULT 0 (Calculated dynamically between 0 and 100)
    *   `compliance_status` VARCHAR(25) NOT NULL DEFAULT 'MISSING' (CHECK status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING'))
    *   `days_until_expiry` INT DEFAULT NULL
    *   *Audit Columns*: `created_at`, `updated_at`
*   **Performance Indexes**: Add indexes supporting lookup joins:
    *   Composite index on version active flags: `(student_id, is_active)`
    *   Partial indexes filtering active rows.

### 2. Backend Scope (Backend Engineer Agent)
*   **Interfaces**: Define `IDocumentRepository` to abstract operations.
*   **Supabase implementation**: Implement `SupabaseDocumentRepository` using raw query parameters.
*   **Compliance Status Engine**: 
    *   Implement a shared, single-source-of-truth status calculation module (`ComplianceStatusEngine`) mapping active documents to standard values:
        *   `COMPLIANT`: Document is verified and has days_left >= threshold.
        *   `WARNING`: Document is verified but days_left < threshold (BR-005).
        *   `EXPIRED`: Document is verified but days_left <= 0.
        *   `PENDING_VERIFICATION`: Document uploaded but verification_status = 'pending'.
        *   `REJECTED`: Document uploaded but verification_status = 'rejected'.
        *   `MISSING`: No active document version exists.
    *   Every document service and snapshot calculation must invoke this engine to determine statuses.
*   **Services**:
    *   `DocumentService`: Coordinates upload entries, status updates, and historical lookups.
    *   `VersionManager`: Validates that exactly one record remains marked `is_active = TRUE` for any student/document.
    *   `SnapshotManager`: Recomputes the cached compliance snapshot table whenever active documents are modified.
    *   `ExpiryCalculator`: Computes days-left values, determining compliance warning levels (BR-005).
    *   `VerificationWorkflow`: Executes document approve/reject state changes and logs audit tracking metrics.
*   **Future Integrations & Reporting Support**:
    *   *Dashboard summaries*: Group and count students by status totals.
    *   *Reporting*: Generate csv audits for students whose documents are in WARNING/EXPIRED.
    *   *Reminder Scheduling*: Hook notification workers to check documents in WARNING and trigger warning dispatches.
*   **Exclusions**: No real integration code targeting SMTP/WhatsApp email alerts.

### 3. Frontend Scope (Frontend Engineer Agent)
*   **Dashboard View**: Build a Compliance Dashboard featuring snapshot statistics.
*   **Shared UI Panels**:
    *   `DocumentCard`: Component rendering status, number, expiry dates, and file links.
    *   `UploadDialog`: Form capturing fields (number, dates, and file picker).
    *   `VersionHistory`: Directory table detailing previous versions.
    *   `PDFViewer`: Sandboxed document preview utility.
*   **Actions**: Implement Verify/Reject dialog triggers, replace files, and discard edits prompts.

### 4. Storage Scope (DevOps/Backend Agent)
*   **Bucket Configuration**: Set up single private canonical bucket `iscms-documents`.
*   **Application-Managed Prefix Layout**:
    *   `students/{studentId}/passport/v{version}/{filename}`
    *   `students/{studentId}/visa/v{version}/{filename}`
    *   `students/{studentId}/efrro/v{version}/{filename}`
*   **Access Protocols**: Access files exclusively using short-lived signed URLs (expires in 5–15 minutes).

### 5. Validation Rules
*   **Dates**: `expiry_date` must be strictly after `issue_date`.
*   **Files**: Allowed type `application/pdf` only. Size must not exceed 2MB.

### 6. QA Scope (QA Engineer Agent)
*   **Audit**: Verify active version checks, database constraint integrity, type parameters, and access controls.
*   **Reports**: Write `docs/sprints/Sprint-03-QA-Report.md` detailing security, risk, regression, and performance audits.

---

## Acceptance Criteria & Definition of Done

### Acceptance Criteria
*   An administrator can upload a document PDF, which is stored in a student-isolated private folder.
*   If a new version is uploaded, previous active records are automatically marked inactive.
*   The compliance snapshot calculations update instantly after a document's verification status changes.
*   Document files are served using signed, time-limited URLs to prevent unauthorized links.
*   The dashboard filters students matching critical warnings, compliant status, and passport expirations.

### Definition of Done (DoD)
1.  All SQL migrations compile and run successfully.
2.  TypeScript typechecking passes with **0 errors**.
3.  Linter check (`npm run lint`) passes with **0 warnings and 0 errors**.
4.  Next.js production build (`npm run build`) builds the application successfully.
5.  QA compliance report is written and added to the sprints directory.

---

## Deliverables Matrix

| Team | Deliverable Name | File Path | Status |
| :--- | :--- | :--- | :--- |
| **Database** | Documents & Snapshot Migration | `supabase/migrations/005_documents.sql` | Planned |
| **Backend** | Document Repository contract | `src/services/document/document.repository.ts` | Planned |
| **Backend** | Document Service class | `src/services/document/document.service.ts` | Planned |
| **Backend** | Expiry and Compliance Calculators | `src/services/compliance/compliance.engine.ts` | Planned |
| **Frontend** | Compliance Dashboard view | `src/app/(app)/dashboard/page.tsx` | Planned |
| **Frontend** | Reusable Document Panel Components | `src/components/documents/document-panel.tsx` | Planned |
| **QA** | QA Compliance Audit Report | `docs/sprints/Sprint-03-QA-Report.md` | Planned |

---

## Risk Management & Mitigations

*   **Risk 1**: Overlapping active versions leading to compliance status calculations mismatches.
    *   *Mitigation*: Enforce a strict unique partial constraint on the database: `CREATE UNIQUE INDEX unique_active_doc ON document_versions(student_id) WHERE is_active = TRUE;`.
*   **Risk 2**: Leakage of private student files (PII) to unauthenticated users.
    *   *Mitigation*: Disable public access to the bucket. Serve files strictly using short-lived signed URLs.
*   **Risk 3**: Slow dashboard loading due to scanning compliance logs dynamically.
    *   *Mitigation*: Query the pre-cached `student_snapshot` table instead of joining active versions tables on demand.

---

## Best Practices
*   Never write inline SQL inside frontend component pages.
*   Enforce uppercase file extensions validation inside the upload dialog.

---

## Future Updates
*   Sprint 4 will cover the cron-based Notification Engine dispatching warnings.

---

## Revision History
| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-07-07 | Project Governance Board | Initial Version Release |

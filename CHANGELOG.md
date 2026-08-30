# Changelog

All notable changes to the **International Student Compliance Management System (ISCMS)** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - In Development

### Planned
- **Self-Service Student Verification Portal**: Enhanced student-facing document submission, verification tracking, and renewal requests.
- **Automated External WhatsApp Gateway**: Meta WhatsApp Business Cloud API automated outbound dispatch.
- **Enterprise Email Delivery**: Resend SMTP/API institutional email notification dispatch.
- **Batch Export Enhancements**: Multi-format exports (PDF summary dossiers, Excel compliance audits).
- **Advanced Document OCR & Ingestion**: Automated metadata extraction and pre-fill for scanned passports and visas.

---

## [0.2.0] - 2026-08-30

### Stable Release Baseline (Frozen)
Version `v0.2.0` represents the production milestone baseline for ISCMS, establishing strict administrative governance, progressive student registration, canonical academic hierarchies, ISO country/dial code standardization, graduation-aware reminder boundaries, single canonical storage architecture, and live system diagnostics.

### Added
- **Progressive Student Registration**:
  - Multi-step student creation workflows supporting incomplete initial profiles (`048_progressive_student_registration.sql`, `053_student_registration_expansion.sql`).
  - Optional field support for permanent address, residential address, emergency contacts, and embassy/consulate liaison details (`044_allow_nullable_optional_student_fields.sql`).
  - Admission category tracking (`ICCR`, `Study in India (SII)`, `Self-Finance`, `Exchange / MoA`, `Government Sponsored`) with dedicated application identifier columns (`iccr_application_number`, `sii_application_number`).
  - Campus designation tracking across National Forensic Sciences University (NFSU) campus network (`061_add_nfsu_campus_to_student_academic.sql`).
- **Academic Hierarchy & Course Standardization**:
  - Canonical academic program catalog tracking degree levels (`UG`, `PG`, `INTEGRATED`, `PhD`, `Diploma`), duration in semesters, and school/department foreign keys (`050_academic_program_integrity.sql`, `055_standardize_academic_program_identity.sql`).
  - Standardized school/department master catalog (`056_canonical_schools_and_departments.sql`).
  - Automatic semester progression and graduation date calculation from admission date.
  - Referential integrity protections preventing accidental cascading deletion of active programs (`059_academic_deletion_referential_integrity.sql`).
- **Document Compliance & Expiry Engine**:
  - Three mandatory compliance document classifications: **Passport**, **Visa**, and **eFRRO / Residential Permit** (`067_enforce_efrro_in_compliance.sql`).
  - Architectural separation between compliance metadata snapshot (`student_snapshot`) and immutable physical file version histories (`passport_versions`, `visa_versions`, `efrro_versions`).
  - Support for metadata-only registrations without generating synthetic or fake file versions.
  - Administrative document renewal and version history preservation allowing renewals with or without attachments (`063_student_portal_removal_and_document_renewals.sql`).
  - Side-by-side inspection viewer for administrative review with one-click verification and rejection workflows with audit notes.
- **Compliance Reminder & Graduation Boundary Engine**:
  - Multi-threshold automated reminder scheduling at **90, 60, 30, 15, and 7 days** prior to expiration.
  - Graduation date boundary enforcement (`049_v020_phone_numbers_and_reminder_boundary.sql`, `051_reconcile_reminders_after_graduation.sql`): reminders are suppressed and queued alerts canceled when `document_expiry_date > student_graduation_date`.
  - Idempotent reminder dispatch using deterministic idempotency keys (`{student_id}:{document_type}:{threshold_days}`).
  - Timezone-safe calendar calculations via `CalendarDateEngine`.
  - Multilingual notification template engine with dynamic parameter substitution (`{{student_name}}`, `{{expiry_date}}`, `{{days_remaining}}`, `{{enrollment_number}}`, `{{compliance_email}}`, `{{institution_name}}`).
- **International Country & Dial Code Master Data**:
  - Master dataset of 120+ ISO 3166-1 countries with ISO codes, country names, and international phone dial codes (`045_countries_master_system.sql`, `049_v020_phone_numbers_and_reminder_boundary.sql`).
  - Searchable `PhoneInput` component with international flags, dial code selection, and E.164 normalization.
- **Bulk Student Onboarding**:
  - Excel (`.xlsx`, `.xls`) and CSV ingestion engine using SheetJS (`xlsx`).
  - Intelligent header auto-mapping with alias dictionaries.
  - Two-pass production validation distinguishing between fatal errors and non-blocking warnings.
  - Spreadsheet formula injection protection (`=`, `+`, `-`, `@`).
  - Auditable import batch tracking (`import_batches`) with one-click atomic batch rollback.
- **Storage & Infrastructure**:
  - Single canonical private storage bucket architecture (`iscms-documents`).
  - Hierarchical folder structure: `students/{student_id}/{document_type}/v{version_number}/{uuid}.{ext}`.
  - Server-side magic-byte MIME signature verification (PDF, JPEG, PNG).
  - Time-bounded presigned URL generation (15-minute expiration) with zero public bucket exposure.
- **Security & Identity Governance**:
  - Row Level Security (RLS) policies across all PostgreSQL tables (`027_complete_rls_security_hardening.sql`, `028_enterprise_rls_policy_standardization.sql`).
  - Strict separation between administrative/staff personnel (`user_profiles`) and student database entities (`054_strict_identity_isolation.sql`, `068_remove_student_roles_from_identity_system.sql`).
  - Initial Setup Wizard (`/setup`) with one-time configuration locking and Emergency Recovery Mode.
  - Dynamic request origin and canonical URL resolution (`src/config/app-url.ts`).
  - Centralized single-source-of-truth version architecture (`package.json` -> `src/config/version.ts` -> UI/API).
  - Live system diagnostics and health probes (`/dashboard/health`, `/health`, `/readiness`, `/liveness`).

### Changed
- Refactored student identity model to maintain student compliance records purely as database entities managed by university staff.
- Standardized notification templates to instruct students to submit renewed documents directly to the International Student Office.
- Upgraded Next.js to `16.2.10`, React to `19.2.4`, and Tailwind CSS to `^4.0`.

---

## [0.1.0] - 2026-08-15

### Added
- Initial core schema for students, passports, visas, and notifications.
- Administrative dashboard layout with metric cards and summary tables.
- Basic Supabase SSR authentication for institutional staff.
- Initial document upload and expiration calculation logic.

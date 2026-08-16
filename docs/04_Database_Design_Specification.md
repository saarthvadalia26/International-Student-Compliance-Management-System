# International Student Compliance Management System (ISCMS)
## Database Design Specification (DDS) - Version 1.1 (Revised)

This document serves as the final governing database specification for the International Student Compliance Management System (ISCMS). It provides the concrete implementation blueprint for all local and production Supabase migrations.

---

## Section 1 – Architectural Decision Records (ADRs)

Every major database decision is categorized below. These ADRs are referenced throughout this specification.

- **ADR-001: UUID Primary Keys**
  - **Decision**: All table primary keys must use PostgreSQL `UUID v4` generated via the `gen_random_uuid()` function.
  - **Rationale**: Prevents URL enumeration attacks, simplifies multi-region sync, and allows clients to generate IDs safely before database insertion.
- **ADR-002: Versioned Passport/Visa/eFRRO Records**
  - **Decision**: Passports, Visas, and eFRRO documents are never updated inline. New entries are added to version tables (`*_versions`) with an `is_current` boolean flag.
  - **Rationale**: Maintains a complete history of student immigration status for statutory audit compliance.
- **ADR-003: Student Snapshot Pattern**
  - **Decision**: A single `student_snapshot` table caches the computed compliance status (`compliant`, `warning`, `non_compliant`) and remaining days for active documents.
  - **Rationale**: Decouples heavy multi-table joins from read-intensive dashboards, serving page lists in a single fast query.
- **ADR-004: Immutable Activity Log**
  - **Decision**: Audit tables (`activity_log`, `notifications`) are append-only. Triggers prevent `UPDATE` and `DELETE` queries.
  - **Rationale**: Satisfies compliance and security requirements for tamper-proof history.
- **ADR-005: Notification Queue**
  - **Decision**: Email and WhatsApp alerts are written to a database-driven queue (`notifications`) and processed asynchronously by background workers.
  - **Rationale**: Prevents application latencies from affecting transaction times and handles communication API retry logic reliably.
- **ADR-006: Database Normalization Strategy**
  - **Decision**: The database is structured in Third Normal Form (3NF). Student personal data, contact coordinates, and academic statuses are isolated.
  - **Rationale**: Guarantees data consistency, avoids sparse tables, and enforces referential integrity.

---

## Section 2 – Table Inventory & Delete Policies

For every table, a strict Delete Policy is defined to maintain compliance integrity.

| Table Name | Module | Primary Key | Delete Policy | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `students` | Core | `id` (UUID) | **Soft Delete** | Preserve compliance logs for statutory inspections; hidden from default views. |
| `student_personal` | Core | `student_id` | **Soft Delete** | cascade soft delete with `students`. |
| `student_contact` | Core | `student_id` | **Soft Delete** | cascade soft delete with `students`. |
| `student_academic` | Core | `student_id` | **Soft Delete** | cascade soft delete with `students`. |
| `student_relationships` | Core | `id` (UUID) | **Restricted Delete** | Can only be deleted if not referenced by active overrides. |
| `student_embassy` | Core | `student_id` | **Soft Delete** | cascade soft delete with `students`. |
| `passport_versions` | Documents | `id` (UUID) | **Never Delete** | Required for permanent audit history under **ADR-002**. |
| `visa_versions` | Documents | `id` (UUID) | **Never Delete** | Required for permanent audit history under **ADR-002**. |
| `efrro_versions` | Documents | `id` (UUID) | **Never Delete** | Required for permanent audit history under **ADR-002**. |
| `student_snapshot` | Documents | `student_id` | **Soft Delete** | Cached data is cascade deleted with the parent student under **ADR-003**. |
| `student_fee_structure` | Finance | `id` (UUID) | **Never Delete** | Preserves financial and enrollment transaction records permanently. |
| `student_hostel_fee_structure`| Finance | `id` (UUID) | **Never Delete** | Preserves financial lodging transaction records permanently. |
| `notifications` | Compliance | `id` (UUID) | **Never Delete** | Append-only transaction communication logs under **ADR-004** / **ADR-005**. |
| `activity_log` | Compliance | `id` (UUID) | **Never Delete** | Append-only system audit log under **ADR-004**. |
| `reference_data` | Config | `code` (string)| **Never Delete** | Reference lookups can only be deprecated, never deleted if referenced. |
| `system_settings` | Config | `key` (string) | **Update Only** | Deletion violates system behavior. Only updates are allowed. |
| `holiday_calendar` | Config | `date` (date) | **Restricted Delete** | Can be deleted only if date is in the future. |

---

## Section 3 – Column Specifications

*(Reference: All primary keys use **ADR-001** and child tables apply normalization under **ADR-006**).*

### 1. `students`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `registration_number` (VARCHAR(50), Not Null): Unique institutional student ID.
- `status` (VARCHAR(20), Not Null, Default `'active'`): `CHECK (status IN ('active', 'suspended', 'graduated', 'withdrawn'))`.
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).
- `updated_at` (TIMESTAMPTZ, Not Null, Default `now()`).
- `deleted_at` (TIMESTAMPTZ, Nullable, Default `NULL`): Marks soft-deleted rows.

### 2. `student_personal`
- `student_id` (UUID, Not Null): Primary Key, FK referencing `students(id) ON DELETE CASCADE`.
- `full_name` (VARCHAR(255), Not Null): Legal name matching passport.
- `nationality_code` (VARCHAR(20), Not Null): FK referencing `reference_data(code) ON DELETE RESTRICT`.
- `gender` (VARCHAR(10), Not Null): `CHECK (gender IN ('male', 'female', 'other'))`.
- `date_of_birth` (DATE, Not Null): `CHECK (date_of_birth < CURRENT_DATE)`.
- `blood_group` (VARCHAR(5), Nullable).
- `religion` (VARCHAR(50), Nullable).

### 3. `student_contact`
- `student_id` (UUID, Not Null): Primary Key, FK referencing `students(id) ON DELETE CASCADE`.
- `email` (VARCHAR(255), Not Null): `UNIQUE`, `CHECK (email ~* '^.+@.+\..+$')`.
- `phone_home` (VARCHAR(20), Not Null): Country code prefixed home contact.
- `phone_local` (VARCHAR(20), Nullable): Country code prefixed host contact.
- `permanent_address` (TEXT, Not Null): Address in home country.
- `local_address` (TEXT, Nullable): Address in host country.

### 4. `student_academic`
- `student_id` (UUID, Not Null): Primary Key, FK referencing `students(id) ON DELETE CASCADE`.
- `program_code` (VARCHAR(20), Not Null): FK referencing `reference_data(code) ON DELETE RESTRICT`.
- `admission_date` (DATE, Not Null).
- `expected_graduation` (DATE, Not Null): `CHECK (expected_graduation > admission_date)`.
- `current_semester` (INT, Not Null, Default `1`): `CHECK (current_semester > 0 AND current_semester < 20)`.
- `academic_status` (VARCHAR(20), Not Null, Default `'good_standing'`): `CHECK (academic_status IN ('good_standing', 'probation', 'suspended'))`.

### 5. `student_relationships`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `relationship_type` (VARCHAR(20), Not Null): `CHECK (relationship_type IN ('parent', 'guardian', 'local_sponsor'))`.
- `name` (VARCHAR(255), Not Null).
- `email` (VARCHAR(255), Nullable).
- `phone` (VARCHAR(20), Not Null).
- `address` (TEXT, Nullable).

### 6. `student_embassy`
- `student_id` (UUID, Not Null): Primary Key, FK referencing `students(id) ON DELETE CASCADE`.
- `embassy_name` (VARCHAR(255), Not Null).
- `contact_person` (VARCHAR(255), Nullable).
- `email` (VARCHAR(255), Nullable).
- `phone` (VARCHAR(20), Nullable).
- `address` (TEXT, Not Null).

### 7. `passport_versions`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `passport_number` (VARCHAR(50), Not Null).
- `issue_date` (DATE, Not Null).
- `expiry_date` (DATE, Not Null): `CHECK (expiry_date > issue_date)`.
- `issue_place` (VARCHAR(100), Not Null).
- `is_current` (BOOLEAN, Not Null, Default `true`).
- `verification_status` (VARCHAR(20), Not Null, Default `'pending'`): `CHECK (verification_status IN ('pending', 'verified', 'rejected'))`.
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 8. `visa_versions`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `visa_number` (VARCHAR(50), Not Null).
- `issue_date` (DATE, Not Null).
- `expiry_date` (DATE, Not Null): `CHECK (expiry_date > issue_date)`.
- `visa_type_code` (VARCHAR(20), Not Null): FK referencing `reference_data(code) ON DELETE RESTRICT`.
- `is_current` (BOOLEAN, Not Null, Default `true`).
- `verification_status` (VARCHAR(20), Not Null, Default `'pending'`): `CHECK (verification_status IN ('pending', 'verified', 'rejected'))`.
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 9. `efrro_versions`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `certificate_number` (VARCHAR(50), Not Null).
- `issue_date` (DATE, Not Null).
- `expiry_date` (DATE, Not Null): `CHECK (expiry_date > issue_date)`.
- `file_path` (TEXT, Not Null).
- `is_current` (BOOLEAN, Not Null, Default `true`).
- `verification_status` (VARCHAR(20), Not Null, Default `'pending'`): `CHECK (verification_status IN ('pending', 'verified', 'rejected'))`.
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 10. `student_snapshot`
- `student_id` (UUID, Not Null): Primary Key, FK referencing `students(id) ON DELETE CASCADE`.
- `compliance_status` (VARCHAR(20), Not Null, Default `'compliant'`): `CHECK (compliance_status IN ('compliant', 'warning', 'non_compliant', 'expired'))`.
- `days_to_passport_expiry` (INT, Nullable).
- `days_to_visa_expiry` (INT, Nullable).
- `days_to_efrro_expiry` (INT, Nullable).
- `last_calculated_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 11. `student_fee_structure`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `fee_type_code` (VARCHAR(20), Not Null): FK referencing `reference_data(code) ON DELETE RESTRICT`.
- `amount` (NUMERIC(12,2), Not Null): `CHECK (amount >= 0)`.
- `due_date` (DATE, Not Null).
- `status` (VARCHAR(20), Not Null, Default `'unpaid'`): `CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue'))`.
- `paid_amount` (NUMERIC(12,2), Not Null, Default `0.00`): `CHECK (paid_amount <= amount)`.
- `updated_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 12. `student_hostel_fee_structure`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `room_number` (VARCHAR(20), Not Null).
- `amount` (NUMERIC(12,2), Not Null): `CHECK (amount >= 0)`.
- `due_date` (DATE, Not Null).
- `status` (VARCHAR(20), Not Null, Default `'unpaid'`): `CHECK (status IN ('unpaid', 'paid', 'overdue'))`.
- `updated_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 13. `notifications`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `student_id` (UUID, Not Null): FK referencing `students(id) ON DELETE CASCADE`.
- `document_type` (VARCHAR(20), Not Null): `CHECK (document_type IN ('passport', 'visa', 'efrro'))`.
- `alert_threshold_days` (INT, Not Null).
- `channel` (VARCHAR(10), Not Null): `CHECK (channel IN ('email', 'whatsapp', 'both'))`.
- `recipient_address` (VARCHAR(255), Not Null).
- `status` (VARCHAR(20), Not Null, Default `'queued'`): `CHECK (status IN ('queued', 'sent', 'failed', 'cancelled'))`.
- `payload` (JSONB, Not Null).
- `retry_count` (INT, Not Null, Default `0`): `CHECK (retry_count >= 0)`.
- `next_retry_at` (TIMESTAMPTZ, Nullable, Default `NULL`).
- `sent_at` (TIMESTAMPTZ, Nullable, Default `NULL`).
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 14. `activity_log`
- `id` (UUID, Not Null, Default `gen_random_uuid()`): Primary Key.
- `actor_id` (UUID, Nullable): References Supabase auth `users` table.
- `action` (VARCHAR(10), Not Null): `CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))`.
- `event_name` (VARCHAR(50), Not Null): Mapped from event dictionary (e.g., `'StudentCreated'`).
- `table_name` (VARCHAR(50), Not Null).
- `row_id` (UUID, Not Null).
- `changes` (JSONB, Nullable).
- `created_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 15. `reference_data`
- `code` (VARCHAR(20), Not Null): Primary Key.
- `category` (VARCHAR(30), Not Null).
- `value` (VARCHAR(100), Not Null).

### 16. `system_settings`
- `key` (VARCHAR(50), Not Null): Primary Key.
- `value` (JSONB, Not Null).
- `updated_at` (TIMESTAMPTZ, Not Null, Default `now()`).

### 17. `holiday_calendar`
- `date` (DATE, Not Null): Primary Key.
- `description` (VARCHAR(255), Not Null).

---

## Section 4 – State Machines

### 1. Student Status
Valid state transitions for the `students.status` field.
```
  [active] ────► [suspended] ◄───► [withdrawn]
     │               │                 ▲
     ├───────────────┼─────────────────┘
     ▼               ▼
[graduated] ────► [withdrawn]
```
- **active**: Enrolled and compliant (or in standard warning state). Can transition to `suspended` (disciplinary/compliance failure), `graduated` (normal exit), or `withdrawn` (leaving program early).
- **suspended**: Compliance status critical or disciplinary action. Can return to `active` once verified, or transition to `withdrawn`.
- **graduated**: Completed program. Terminal state, can transition to `withdrawn` only if backdated records are adjusted.
- **withdrawn**: Left university. Terminal state.

### 2. Notification Status
Valid transitions for `notifications.status`.
```
[queued] ─────► [sent]
   │              ▲
   │              │
   ├─► [failed] ──┘ (after retries <= 3)
   │
   └─► [cancelled] (due to document renewal)
```
- **queued**: Alert generated by cron/trigger, awaiting next retry cycle.
- **sent**: Delivered successfully. Terminal state.
- **failed**: Three retries exhausted. Terminal state.
- **cancelled**: Dequeued automatically because the student completed renewal before dispatch. Terminal state.

### 3. Document Version Status
Valid transitions for verification status on passport, visa, and eFRRO versions.
```
[pending] ───► [verified] (is_current set to true)
   │
   └───► [rejected] (demands re-upload)
```
- **pending**: Fresh upload, needs admin audit.
- **verified**: Checked by admin. Setting a new document version as `verified` automatically triggers the deprecation of older versions (`is_current = false`).
- **rejected**: Audit failed. Triggers warning workflow for re-upload.

---

## Section 5 – Reminder Calculation Rules

- **Lead Times**: Document expiries trigger alerts at exactly:
  - 90 days (Early notice)
  - 60 days (Administrative warning)
  - 30 days (Urgent renewal required)
  - 15 days (Critical warning)
  - 7 days (Daily dispatch trigger)
- **Working-Day and Holiday Calculation**:
  - The notification engine checks the `holiday_calendar` to calculate target dispatch times.
  - If a computed dispatch date lands on a weekend (Saturday/Sunday) or an entry in `holiday_calendar`, the system moves the dispatch date forward to the preceding working day.
- **Renewal Detection and Auto-Cancellation**:
  - If a student uploads a renewed visa, it enters a `pending` status.
  - While it is `pending`, warnings continue.
  - Once marked `verified` by an administrator, a trigger fires on the version table, locating all rows in `notifications` for this student where `document_type = [Type]` AND `status = 'queued'`. It updates their status to `'cancelled'`, removing them from active background queues.

---

## Section 6 – Compliance Health Algorithm

A student's global compliance health (`student_snapshot.compliance_status`) is compiled from the active passport, visa, and eFRRO documents. The logic evaluates expiration dates and verification statuses, resolving using the **Precedence of Severity** (Critical > Warning > Healthy).

```
   ┌────────────────────────────────────────────────────────┐
   │ Check Active Documents (Passport, Visa, eFRRO)         │
   └───────────────────────────┬────────────────────────────┘
                               ▼
        Is any document EXPIRED or REJECTED?
        ├─► YES ────────► [Critical]
        └─► NO
             │
             ▼
        Is any document within 30 days of expiry OR 'pending' verification?
        ├─► YES ────────► [Warning]
        └─► NO ─────────► [Healthy]
```

### Precedence Priority Table
| Active Passport State | Active Visa State | Active eFRRO State | Overall Status |
| :--- | :--- | :--- | :--- |
| Expired / Rejected | *Any* | *Any* | **Critical** |
| *Any* | Expired / Rejected | *Any* | **Critical** |
| *Any* | *Any* | Expired / Rejected | **Critical** |
| Warning (<30 Days) | *Any* | *Any* | **Warning** |
| Pending Verification | *Any* | *Any* | **Warning** |
| Valid (>30 Days) | Valid (>30 Days) | Valid (>30 Days) | **Healthy** |

---

## Section 7 – Business Rule Catalogue

- **BR-001: Registration Number Unique**
  - Registration numbers must be unique across all active and suspended student records.
- **BR-002: Only One Current Passport**
  - A student can have only one passport version marked `is_current = true`.
- **BR-003: Passport Issue Date Before Expiry**
  - A passport's expiry date must be after its issue date.
- **BR-004: Only One Current Visa**
  - A student can have only one visa version marked `is_current = true`.
- **BR-005: Visa Expiry Date Bounds**
  - The visa expiry date must fall within the validity period of the active passport.
- **BR-006: eFRRO Mandate by Nationality**
  - Students from specific countries in `reference_data` must register eFRRO documents. For exempted nationalities, eFRRO verification is skipped.
- **BR-007: Only One Current eFRRO**
  - A student can have only one eFRRO/RP certificate version marked `is_current = true`.
- **BR-008: Auto-Cancellation on Verify**
  - Verifying a new document version must cancel all pending notifications for that document category.

---

## Section 8 – Event Naming Standard (Activity Log)

To ensure consistency in audit trails, all events written to `activity_log.event_name` must use the following taxonomy:

- **`StudentCreated`**: A new student skeleton is added to `students`.
- **`StudentUpdated`**: Academic or personal contact details are edited.
- **`PassportRenewed`**: A new passport version is inserted.
- **`VisaRenewed`**: A new visa version is inserted.
- **`EFRROUploaded`**: A new eFRRO certificate version is added.
- **`ReminderScheduled`**: A notification entry is written with `status = 'queued'`.
- **`ReminderSent`**: An alert is successfully sent via Email or WhatsApp.
- **`ReminderFailed`**: Notification delivery failed after exhausting all retry attempts.
- **`ReminderCancelled`**: Queued alerts cancelled due to document verification.
- **`NotificationRetried`**: Background worker attempts redelivery of a failed alert.

---

## Section 9 – Database Capacity Assumptions

- **Operational Scale Assumptions (10-Year Growth Window)**:
  - **Students**: 5,000 active profiles (growth rate of 500/year).
  - **Notifications**: 300,000 records (estimated 6 reminders per student per year, including history retention).
  - **Activity Logs**: 1,200,000 logs (all audit events).
  - **Storage**: ~15,000 PDF documents (assuming average file size of 1.5MB = ~22.5GB).
- **Indexing Support**:
  - The B-Tree indexes on `expiry_date` and composite indexes on `notifications(status, next_retry_at)` ensure queries filter rows instantaneously, remaining constant at O(log N) as tables scale.
  - The `activity_log` uses partitioning on `created_at` yearly to prevent query degradation over time.

---

## Section 10 – Reference Data History Preservation

- **The Problem**: If a course fee changes, updating reference data could invalidate historical receipts.
- **Solution**: The `reference_data` values are versioned, or transactional tables store snapshots of lookups at the time of the event.
  - Fee structures (`student_fee_structure`) copy the exact `numeric` fee value rather than referencing the configuration dynamically.
  - Program names and visa names are joined on strict code keys. If reference data is updated, the changes do not affect already completed transactions.

---

## Section 11 – Evaluation of a Shared Parent Document Entity

- **Proposal**: Introduce a single `documents` table (with common metadata fields like student ID and status) that maps to child tables `passport_versions`, `visa_versions`, and `efrro_versions`.
- **Evaluation**:
  - **Rejected**.
  - **Rationale**: Passports, Visas, and eFRRO certifications have distinct structural attributes (e.g. visa types, certificate numbers, passport issuance locations, and storage paths). Unifying them into a single parent table requires either:
    1. A polymorphic join pattern (which lacks native referential integrity constraints).
    2. A highly sparse table containing empty columns.
    3. A JSONB field for document-specific attributes (which violates **ADR-006** normalizations and prevents strict database column validations).
  - **Selected Approach**: Separate version tables remain the cleanest structure, ensuring database-level type checking and normalization. Document status aggregation is handled by `student_snapshot` (**ADR-003**), which acts as the unified index for compliance monitoring.

---

## Section 12 – Index Strategy

*(Reference: Employs **ADR-001** and index policies).*

- **`students_deleted_at_idx`**: Partial B-Tree on `students(deleted_at) WHERE deleted_at IS NULL`.
- **`passport_expiry_idx`**: B-Tree on `passport_versions(expiry_date) WHERE is_current = true`.
- **`visa_expiry_idx`**: B-Tree on `visa_versions(expiry_date) WHERE is_current = true`.
- **`efrro_expiry_idx`**: B-Tree on `efrro_versions(expiry_date) WHERE is_current = true`.
- **`notifications_queue_idx`**: Composite B-Tree on `notifications(status, next_retry_at) WHERE status = 'queued'`.
- **`activity_log_lookup_idx`**: B-Tree on `activity_log(table_name, row_id)`.

---

## Section 13 – Triggers Specification

- **`set_updated_at`**: Before `UPDATE`, sets `updated_at = now()`.
- **`log_activity_event`**: After `INSERT` or `UPDATE` or `DELETE`, logs event details and data changes to `activity_log`.
- **`update_compliance_snapshot`**: Updates expiration dates and worst-case status cached in `student_snapshot`.
- **`handle_document_versioning`**: Set pre-existing entries to `is_current = false` when a new verified version is inserted.
- **`cancel_notifications_on_verification`**: Sets pending queued notification records to `cancelled` once a new document version is verified.

---

## Section 14 – Storage Design

- **Bucket name**: `iscms-documents` (Set to private, single canonical bucket in Cloudflare R2 / Supabase Storage).
- **Application-Managed Prefix Layout**:
  - `students/{studentId}/{documentType}/v{version}/{filename}`
- **Security Policy**: Read access requires an authorized signed URL (valid for 5 minutes). Direct bucket access is blocked; object keys are generated and accessed via server actions and authenticated API workflows.

---

## Section 15 – Row Level Security (RLS)

- **`reference_data` / `holiday_calendar`**:
  - `SELECT`: Allowed for authenticated users.
  - `INSERT / UPDATE / DELETE`: Limited to administrators.
- **`students` / `student_personal` / `student_contact` / `student_academic`**:
  - `SELECT / INSERT / UPDATE`: Restricted to administrators and auditors.
  - `DELETE`: Soft-delete restriction (admin updates `deleted_at` timestamp).
- **`passport_versions` / `visa_versions` / `efrro_versions`**:
  - `SELECT`: Allowed for administrators and auditors.
  - `INSERT / UPDATE`: Restricted to administrators.
  - `DELETE`: Blocked for everyone to preserve historical documents.

---

## Section 16 – Migration Strategy

1. **`001_extensions.sql`**: Enables UUID generation extension (`pgcrypto`).
2. **`002_reference_data.sql`**: Sets up lookups and populates configuration values.
3. **`003_students.sql`**: Creates `students` and normalized personal/contact/academic details tables.
4. **`004_documents.sql`**: Creates `passport_versions`, `visa_versions`, `efrro_versions`, and `student_snapshot`.
5. **`005_notifications.sql`**: Creates `notifications` queue and `activity_log`.
6. **`006_configuration.sql`**: Creates `system_settings` and `holiday_calendar`.
7. **`007_indexes.sql`**: Enforces secondary indexes and unique constraints.
8. **`008_triggers.sql`**: Sets up automated audit triggers and status modifications.
9. **`009_rls.sql`**: Activates RLS policies.
10. **`010_storage.sql`**: Configures storage buckets and access controls.

**Rationale**: Database dependencies must be resolved first. Configuration and students must exist before document tables can reference them. Triggers and RLS rules are applied last to ensure all target tables are fully established.

# Sprint 06 - Database Design Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Table Definitions

The database design introduces three distinct audit, logging, and token verification tables to support the Student Portal:

### 1.1 `student_upload_tokens`
Stores SHA-256 hashed secure tokens used for passwordless reminder logins.
*   `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
*   `student_id` UUID NOT NULL REFERENCES `public.students(id) ON DELETE CASCADE`
*   `purpose` VARCHAR(50) NOT NULL CHECK (`purpose IN ('UPLOAD', 'LOGIN', 'PASSWORDLESS_LOGIN')`)
*   `token_hash` VARCHAR(255) UNIQUE NOT NULL
*   `expires_at` TIMESTAMPTZ NOT NULL
*   `used_at` TIMESTAMPTZ DEFAULT NULL
*   `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
*   `created_by` UUID DEFAULT NULL (Admin ID)

### 1.2 `student_activity_log`
Logs student-initiated events (profile updates, page navigations).
*   `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
*   `student_id` UUID NOT NULL REFERENCES `public.students(id) ON DELETE CASCADE`
*   `action` VARCHAR(100) NOT NULL (e.g., `VIEW_PROFILE`, `UPDATE_CONTACT`)
*   `timestamp` TIMESTAMPTZ NOT NULL DEFAULT `now()`
*   `ip_address` VARCHAR(45) DEFAULT NULL (IPv4/IPv6 client IP)
*   `user_agent` TEXT DEFAULT NULL
*   `details` JSONB DEFAULT `'{}'::jsonb`

### 1.3 `upload_audit_log`
Tracks file upload transactions, checksums, and verification metrics.
*   `id` PRIMARY KEY UUID DEFAULT `gen_random_uuid()`
*   `student_id` UUID NOT NULL REFERENCES `public.students(id) ON DELETE CASCADE`
*   `filename` VARCHAR(255) NOT NULL
*   `file_size` INT NOT NULL (in bytes)
*   `checksum` VARCHAR(64) NOT NULL (SHA-256 hash of file contents)
*   `status` VARCHAR(25) NOT NULL CHECK (`status IN ('success', 'failed_size', 'failed_type', 'failed_virus', 'failed_duplicate')`)
*   `timestamp` TIMESTAMPTZ NOT NULL DEFAULT `now()`
*   `ip_address` VARCHAR(45) DEFAULT NULL
*   `user_agent` TEXT DEFAULT NULL

---

## 2. Performance Indexes

The migration `009_student_portal.sql` sets up indexes targeting quick search queries on hashes and student IDs:
*   `idx_upload_tokens_hash` ON `student_upload_tokens (token_hash)` (B-Tree search)
*   `idx_upload_tokens_student` ON `student_upload_tokens (student_id)`
*   `idx_student_activity_student` ON `student_activity_log (student_id)`
*   `idx_student_activity_timestamp` ON `student_activity_log (timestamp DESC)`
*   `idx_upload_audit_student` ON `upload_audit_log (student_id)`
*   `idx_upload_audit_checksum` ON `upload_audit_log (checksum)` (For duplicate uploader file check)

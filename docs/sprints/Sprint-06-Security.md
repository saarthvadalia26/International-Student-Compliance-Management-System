# Sprint 06 - Security Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Supabase Row Level Security (RLS) Policies

All tables accessed by the Student Portal have RLS policies defined:

### 1.1 `students` & related profile tables
*   **Select Policy**: `auth.uid() = user_id` (Ensures a student can only read their own record).
*   **Update Policy**: Restricted. Students cannot edit university-controlled data.

### 1.2 `student_upload_tokens`
*   **Select/Insert Policy**: Restricted to database admin service role calls during token verification.

### 1.3 `student_activity_log` & `upload_audit_log`
*   **Insert Policy**: Allows logged-in student role (`auth.role() = 'authenticated'`) to insert logs.
*   **Select Policy**: Restrict student access to their own logs (`auth.uid() = user_id` mapped through students table).

---

## 2. Secure File Upload Pipeline

To protect the server storage and DB from malicious actions, the Server Action `uploadEfrro` runs the following validations:

*   **MIME Type Check**: Enforces file upload type is exactly `application/pdf` at server-side check. Future support for images (e.g., JPEG/PNG) can be added to the allowed type array without modifying storage bucket rules.
*   **Max Size Validation**: Limits file streams to 5MB, preventing denial-of-service storage attempts.
*   **Virus Scanning Sandbox**: Hook placeholder is configured in the pipeline to pass stream contents to scan APIs.
*   **Duplicate Prevention Check**: Computes a SHA-256 hash of the incoming file buffer and searches the `upload_audit_log` for matching checksums to reject identical duplicates.

---

## 3. Session Security
*   **Token Expiry**: Upload link tokens expire 7 days after generation. Once used, `used_at` is flagged immediately, rendering the token single-use.
*   **Authentication Middleware Guard**: Next.js protection check inside the student portal layout ensures only authenticated users with metadata `role: 'student'` can navigate student dashboards.

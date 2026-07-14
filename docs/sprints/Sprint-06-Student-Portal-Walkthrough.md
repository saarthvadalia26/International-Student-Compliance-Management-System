# Sprint 06 - Student Portal & Secure eFRRO Renewal

This document walks through the design, implementation, security properties, and verification results of the secure Student Portal built for the International Student Compliance Management System (ISCMS) at the National Forensic Science University (NFSU).

---

## 1. Database Schema Changes

A new migration **[009_student_portal.sql](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/supabase/migrations/009_student_portal.sql)** was created and deployed. The following tables were introduced:

### `student_upload_tokens`
Manages hashed, single-use, time-bound access links.
*   `id` UUID PRIMARY KEY
*   `student_id` References `public.students(id)` with cascade deletes
*   `purpose` Enum string (`UPLOAD`, `LOGIN`, `PASSWORDLESS_LOGIN`)
*   `token_hash` SHA-256 hash unique index
*   `expires_at` Expiry timestamp
*   `used_at` Timestamp of when token was validated
*   `created_by` Admin trace ID

### `student_activity_log`
Logs student-initiated events (profile views, upload submissions).
*   `id` UUID PRIMARY KEY
*   `student_id` References `public.students(id)`
*   `action` Event classification string
*   `timestamp` Created at time
*   `ip_address` Client remote ip
*   `user_agent` Client user agent

### `upload_audit_log`
Tracks file upload transactions, checksums, and verification metrics.
*   `id` UUID PRIMARY KEY
*   `student_id` References `public.students(id)`
*   `filename` File identifier
*   `file_size` File size in bytes
*   `checksum` SHA-256 file contents checksum
*   `status` Enum string (`success`, `failed_size`, `failed_type`, `failed_virus`, `failed_duplicate`)
*   `timestamp` Created at time

---

## 2. Authentication Flow

Authentication aligns with the single source of truth design principle: **Supabase Auth is the single provider** for both admins and students.

### Secure Reminder Upload Links
1.  **Generation**: When a compliance reminder triggers, the system creates a secure token (`crypto.randomBytes(32)`), saves the SHA-256 hash to `student_upload_tokens` with an expiry of 7 days, and embeds the raw token in the reminder URL: `/student/upload/{secure_token}`.
2.  **Verification & Redirection**: When clicked, the landing page calls a Server Action to verify the token hash. If valid, the Server Action retrieves the student's email, checks/creates their profile in `auth.users` with the role `student`, generates a Supabase magic login link, marks the token as used, and redirects the student's browser.
3.  **Authentication**: The browser follows the action link, authenticates the student directly in Supabase Auth, sets the secure cookies, and redirects the student directly to `/student/efrro` to complete renewal.

### Passwordless Login
Students can enter their email directly at `/student/login` to receive a magic link email sent via Supabase.

---

## 3. Student Routes

The following Next.js App Router views were created under `src/app/student/`:

*   **[layout.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/layout.tsx)**: Navigation wrapper enforcing authenticated student role guards.
*   **[login/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/login/page.tsx)**: Sign in portal utilizing standard OTP magic links.
*   **[dashboard/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/dashboard/page.tsx)**: Displays credentials overview, current eFRRO status, days remaining, reminder logs, and upload grids.
*   **[profile/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/profile/page.tsx)**: Displays student contact coordinates and academic tracks.
*   **[history/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/history/page.tsx)**: Detailed grid listing historical renewal files and review comments.
*   **[efrro/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/efrro/page.tsx)**: Features a drag-and-drop file selector, PDF preview frame, size validations, and upload actions.
*   **[upload/[token]/page.tsx](file:///d:/Saarth/Saarth/International%20Student%20Compliance%20Management%20System/src/app/student/upload/[token]/page.tsx)**: Token verification gate that exchanges raw tokens for authenticated sessions.

---

## 4. Secure Upload Pipeline

The upload action is fully transactional and runs the following checks:
1.  **MIME Type Check**: Rejects any file that is not `application/pdf`.
2.  **File Size Check**: Validates that the file stream does not exceed 5MB.
3.  **Virus Scan Placeholder**: An extensible placeholder for virus scanner hook integrations.
4.  **Duplicate Checksum Check**: Computes the SHA-256 hash of the uploaded PDF and queries `upload_audit_log` to reject identical duplicate uploads.
5.  **Storage Write**: Stores the PDF in the `efrro-documents` bucket under `efrro/{student_id}/{year}/{version_uuid}.pdf`.
6.  **Active Reminder Cancellation**: Cancels all queued automated notifications scheduled for the old eFRRO.
7.  **Database Commit**: Creates a new record in `efrro_versions` with status `pending`, updates the compliance snapshot cache state, and logs the upload transaction to `upload_audit_log`.

---

## 5. Files Created

*   `supabase/migrations/009_student_portal.sql`
*   `src/domain/student-portal/types/index.ts`
*   `src/domain/student-portal/repositories/student-portal.repository.ts`
*   `src/domain/student-portal/services/student-portal.service.ts`
*   `src/app/student/layout.tsx`
*   `src/app/student/actions.ts`
*   `src/app/student/login/page.tsx`
*   `src/app/student/dashboard/page.tsx`
*   `src/app/student/profile/page.tsx`
*   `src/app/student/history/page.tsx`
*   `src/app/student/efrro/page.tsx`
*   `src/app/student/upload/[token]/page.tsx`
*   `src/app/student/upload/[token]/actions.ts`
*   `docs/sprints/Sprint-06-Student-Portal-Walkthrough.md`

---

## 6. Verification & Compilation Results

*   **Linter (`npm run lint`)**: Passed successfully with **0 warnings and 0 errors**.
*   **Type Checker (`npx tsc --noEmit`)**: Passed successfully with **0 errors**.
*   **Next.js Builder (`npm run build`)**: Production build succeeded, prerendering all static assets and dynamic modules.

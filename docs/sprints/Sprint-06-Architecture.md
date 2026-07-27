# Sprint 06 - Student Portal Architecture Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 6 - Student Portal Foundation
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Modular Boundaries & Clean Architecture

In alignment with Clean Architecture principles:
*   **UI Views (`/src/app/student/`)**: The client-facing pages (login, dashboard, profile, history, efrro) act strictly as thin presentation controllers. They invoke Server Actions or Domain Services, containing no raw SQL queries, direct Supabase storage manipulations, or raw client configurations.
*   **Domain Layer (`/src/domain/student-portal/`)**:
    *   `types/`: Specifies interfaces for student profiles, eFRRO records, activity logs, and token actions.
    *   `repositories/`: Contracts defining access patterns (`IStudentPortalRepository`).
    *   `services/`: Encapsulates validation business rules, token calculations, and reminders cancellations logic.
*   **Service Layer Integrations**: Connects to the existing `NotificationEngine` and `RetentionService` seamlessly.

---

## 2. Authentication Strategy Evaluation & Recommendation

We evaluated two architectural approaches for NFSU student logins:

| Criteria | Option A: Traditional Password Login | Option B: Secure Magic Link + Single-Use Token (Recommended) |
| :--- | :--- | :--- |
| **User Experience** | Requires students to remember/secure credentials. High friction. | Low friction. Link automatically logs student in and opens the upload screen. |
| **Security Risk** | Weak/reused passwords. Account takeover risk. | Token bound to email inbox/WhatsApp device. Compromise depends on channel. |
| **Integration** | Standard email/password signup flow. | Integrates with notification reminders generating single-use signed tokens. |
| **Maintenance** | Password reset support, lockout policies, key rotation. | Simpler lifecycle. Handled by Supabase OTP Auth. |

### Recommendation
**Option B (Secure Magic Link)** is chosen. When a student receives an email/WhatsApp reminder, it contains a signed token mapping to `/student/upload/{secure_token}`. The portal verifies the token, creates a passwordless OTP session in Supabase Auth, logs the student in, and redirects them to the upload screen immediately.

---

## 3. Scope of Student Compliance

*   **Passport / Visa**: Retained as **Read-Only** compliance records managed exclusively by NFSU administrators. Students cannot upload, delete, or modify these records.
*   **eFRRO**: Students can view their eFRRO details and **ONLY** upload renewed eFRRO PDF documents.

---

## 4. RLS & Tenant Isolation Strategy

Row Level Security (RLS) is enabled on all tables (`students`, `student_personal`, `student_contact`, `efrro_versions`, `student_upload_tokens`, `student_activity_log`, `upload_audit_log`).
*   **Student Policy Constraint**: A student is mapped to their record using `auth.uid() = user_id`. They can only select or update their own row.
*   **Admin Policy Constraint**: Administrators can read and verify all student records.

# Notification Templates Engine Specification

- **Status**: Production-Ready / Final Revision
- **Role**: Lead Software Architect
- **Sprint**: Sprint 7 - Phase 2 (Production Providers)
- **Target Institution**: National Forensic Science University (NFSU)

---

## 1. Supported Variables

The template engine resolves the following parameters at runtime:
*   `{{student_name}}` — The registered full name of the international student.
*   `{{expiry_date}}` — The expiring document validity date.
*   `{{days_remaining}}` / `{{days_left}}` — Difference delta days until absolute expiration.
*   `{{upload_link}}` / `{{secure_upload_link}}` — Unique time-bound upload link.
*   `{{support_email}}` — NFSU international support coordinates (`support@nfsu.edu.in`).
*   `{{university_name}}` — `National Forensic Science University (NFSU)`.

---

## 2. Localization Configuration

Templates are stored in the `notification_templates` database table and supports multiple languages:

*   **English (`en`)**:
    *   *Subject*: `ISCMS Alert: {{document_type}} Expiration Warning`
    *   *Body*: `Dear {{student_name}}, your {{document_type}} is expiring in {{days_left}} days on {{expiry_date}}. Please upload renewed file immediately...`
*   **Hindi (`hi`)**:
    *   *Subject*: `ISCMS अलर्ट: {{document_type}} दस्तावेज समाप्ति चेतावनी`
    *   *Body*: `प्रिय {{student_name}}, आपका {{document_type}} दस्तावेज {{expiry_date}} को समाप्त हो रहा है। कृपया तुरंत पोर्टल में नया दस्तावेज अपलोड करें...`

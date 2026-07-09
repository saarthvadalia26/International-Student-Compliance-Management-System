# Sprint 04 - Notification Engine Database Design Plan (V2)

- **Status**: Revised & Proposed
- **Author**: Database Architect
- **Sprint**: Sprint 4 - Notification Engine

---

## 1. Database Schema Specifications

### A. Notification Templates (`notification_templates`)
Stores versioned and multilingual alert message layouts.
*   `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
*   `code`: VARCHAR(50) NOT NULL (e.g. `EXPIRY_ALERT`)
*   `language_code`: VARCHAR(10) NOT NULL DEFAULT 'en' (Multilingual support: 'en', 'es', 'fr', etc.)
*   `version`: INT NOT NULL DEFAULT 1 CHECK (version > 0)
*   `is_active`: BOOLEAN NOT NULL DEFAULT true
*   `title`: VARCHAR(150) NOT NULL
*   `subject_template`: VARCHAR(255)
*   `body_template`: TEXT NOT NULL (Dynamic template placeholders, e.g. `{{student_name}}`)
*   `created_at`/`updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
*   CONSTRAINT unique_code_lang_version UNIQUE (code, language_code, version)

### B. Student Notification Preferences (`student_notification_preferences`)
Enforces customizable notification preference mappings per student.
*   `student_id`: UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE
*   `channel`: VARCHAR(50) NOT NULL (Future-proofed channels: `'email'`, `'whatsapp'`, `'sms'`, `'push'`, etc.)
*   `is_enabled`: BOOLEAN NOT NULL DEFAULT true
*   `created_at`/`updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
*   PRIMARY KEY (student_id, channel)

### C. Notifications (`notifications`)
Stores queued and processed notification instances.
*   `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
*   `student_id`: UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE
*   `template_id`: UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL
*   `document_type`: VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro'))
*   `status`: VARCHAR(25) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled'))
*   `channel`: VARCHAR(50) NOT NULL
*   `recipient_address`: VARCHAR(255) NOT NULL
*   `retry_count`: INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0)
*   `max_retries`: INT NOT NULL DEFAULT 3
*   `next_retry_at`: TIMESTAMPTZ DEFAULT NULL
*   `scheduled_for`: TIMESTAMPTZ NOT NULL DEFAULT now()
*   `trigger_source`: VARCHAR(50) NOT NULL (e.g. `'event_handler'`, `'cron_scheduler'`)
*   `idempotency_key`: VARCHAR(150) UNIQUE NOT NULL
*   `notification_context`: JSONB DEFAULT '{}'::jsonb (Reserved for future AI-powered customization)
*   `created_at`/`updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### D. Notification Delivery Log (`notification_delivery_log`)
Traces delivery attempts.
*   `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
*   `notification_id`: UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE
*   `attempt_number`: INT NOT NULL
*   `status`: VARCHAR(25) NOT NULL
*   `gateway_response`: JSONB DEFAULT NULL
*   `error_message`: TEXT DEFAULT NULL
*   `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### E. Reminder Rules (`reminder_rules`)
Configuration definitions supporting multiple thresholds and post-expiry reminders.
*   `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
*   `document_type`: VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro'))
*   `alert_threshold_days`: INT NOT NULL (Supports negative integers for post-expiry alerts, e.g. `-7` for one week post-expiry)
*   `channel`: VARCHAR(50) NOT NULL
*   `is_active`: BOOLEAN NOT NULL DEFAULT true
*   `created_at`/`updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### F. Reusable Scheduled Jobs (`scheduled_jobs`)
*   `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
*   `job_name`: VARCHAR(100) NOT NULL
*   `status`: VARCHAR(25) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed'))
*   `started_at`: TIMESTAMPTZ DEFAULT NULL
*   `finished_at`: TIMESTAMPTZ DEFAULT NULL
*   `batch_size`: INT NOT NULL DEFAULT 100
*   `processed_count`: INT NOT NULL DEFAULT 0
*   `error_log`: TEXT DEFAULT NULL
*   `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

---

## 2. Archival & Scaling Indexes
*   Index for batch queue execution (fetch items scheduled to run):
    `CREATE INDEX idx_notifications_queue ON public.notifications (status, scheduled_for) WHERE status = 'queued';`
*   Unique partial active templates helper:
    `CREATE UNIQUE INDEX idx_active_template ON public.notification_templates (code, language_code) WHERE is_active = true;`

-- Migration: 006_notifications
-- Description: Creates schemas for Notification Engine: templates, preferences, delivery logs, scheduled jobs, and reminder rules.
-- Dependencies: 001_enable_extensions.sql, 003_students.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    title VARCHAR(150) NOT NULL,
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_code_lang_version UNIQUE (code, language_code, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_template ON public.notification_templates (code, language_code) WHERE (is_active = true);

COMMENT ON TABLE public.notification_templates IS 'Versioned and localized notification content layouts.';


-- 2. Student Notification Preferences
CREATE TABLE IF NOT EXISTS public.student_notification_preferences (
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, channel)
);

COMMENT ON TABLE public.student_notification_preferences IS 'Student communication channel opt-in/opt-out configuration mappings.';


-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro')),
    status VARCHAR(25) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    channel VARCHAR(50) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ DEFAULT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    trigger_source VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    notification_context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_queue ON public.notifications (status, scheduled_for) WHERE (status = 'queued');
CREATE INDEX IF NOT EXISTS idx_notifications_student_doc ON public.notifications (student_id, document_type);

COMMENT ON TABLE public.notifications IS 'Notification queue instances waiting to be processed.';


-- 4. Notification Delivery Log
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    status VARCHAR(25) NOT NULL,
    gateway_response JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_delivery_log IS 'Logs delivery attempts and responses from integration gateways.';


-- 5. Reminder Rules Table
CREATE TABLE IF NOT EXISTS public.reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro')),
    alert_threshold_days INT NOT NULL,
    channel VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reminder_rules IS 'Triggers mapping validity thresholds (including post-expiry negative offsets) to communication channels.';


-- 6. Scheduled Jobs Table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(25) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NULL,
    finished_at TIMESTAMPTZ DEFAULT NULL,
    batch_size INT NOT NULL DEFAULT 100,
    processed_count INT NOT NULL DEFAULT 0,
    error_log TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scheduled_jobs IS 'Logs recurring scheduler execution statuses, batch sizes, and errors.';

-- Add initial default notification rules (e.g. 90, 60, 30 days pre-expiry, and -7 days post-expiry alerts)
INSERT INTO public.reminder_rules (document_type, alert_threshold_days, channel) VALUES
('passport', 90, 'email'),
('passport', 60, 'email'),
('passport', 30, 'both'),
('passport', -7, 'both'),
('visa', 60, 'email'),
('visa', 30, 'both'),
('visa', 15, 'both'),
('visa', -7, 'both'),
('efrro', 30, 'email'),
('efrro', 15, 'both'),
('efrro', -7, 'both')
ON CONFLICT DO NOTHING;

-- Add initial default email and whatsapp notification template examples
INSERT INTO public.notification_templates (code, language_code, version, is_active, title, subject_template, body_template) VALUES
('EXPIRY_ALERT', 'en', 1, true, 'Document Expiry Alert', 'ISCMS Alert: {{document_type}} Expiration Warning', 'Dear {{student_name}},\n\nYour {{document_type}} is expiring in {{days_left}} days on {{expiry_date}}. Please upload a revised version in the ISCMS portal immediately to maintain compliant standing.\n\nBest regards,\nOffice of International Compliance'),
('EXPIRY_ALERT', 'es', 1, true, 'Alerta de vencimiento del documento', 'Alerta ISCMS: Advertencia de vencimiento de {{document_type}}', 'Estimado {{student_name}},\n\nSu {{document_type}} vencerá en {{days_left}} días el {{expiry_date}}. Cargue una versión revisada en el portal de ISCMS de inmediato para mantener su estado de cumplimiento.\n\nAtentamente,\nOficina de Cumplimiento Internacional')
ON CONFLICT DO NOTHING;

COMMIT;

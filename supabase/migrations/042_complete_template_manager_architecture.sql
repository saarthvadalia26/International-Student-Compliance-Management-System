-- Migration: 042_complete_template_manager_architecture
-- Description: Complete Reminder Template Manager architecture with event types, draft/active/archived statuses, WhatsApp categories, audit logs, and seeded templates.
-- Dependencies: 006_notifications.sql, 011_multilingual_templates.sql, 041_expand_reminders_to_all_documents.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Extend notification_templates with event_type, status, provider metadata, and general document_type
ALTER TABLE public.notification_templates
    DROP CONSTRAINT IF EXISTS notification_templates_document_type_check;

ALTER TABLE public.notification_templates
    ADD CONSTRAINT notification_templates_document_type_check 
    CHECK (document_type IN ('passport', 'visa', 'efrro', 'general', 'all'));

ALTER TABLE public.notification_templates
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) NOT NULL DEFAULT 'document_expiry',
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
    ADD COLUMN IF NOT EXISTS provider_template_name VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS provider_template_id VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150) DEFAULT NULL;

COMMENT ON COLUMN public.notification_templates.event_type IS 'System event triggering this template (e.g. document_expiry, portal_otp, replacement_approved).';
COMMENT ON COLUMN public.notification_templates.status IS 'Lifecycle status (DRAFT, ACTIVE, INACTIVE, ARCHIVED).';
COMMENT ON COLUMN public.notification_templates.provider_template_name IS 'External WhatsApp Business Platform template name if synchronized.';
COMMENT ON COLUMN public.notification_templates.provider_template_id IS 'External provider template unique ID if registered.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_event_doc ON public.notification_templates(event_type, document_type, channel, status);
CREATE INDEX IF NOT EXISTS idx_notification_templates_status ON public.notification_templates(status);

-- 2. Create notification_template_audit_log
CREATE TABLE IF NOT EXISTS public.notification_template_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'DUPLICATED', 'ACTIVATED', 'DEACTIVATED', 'ARCHIVED')),
    actor_id VARCHAR(150) DEFAULT NULL,
    actor_email VARCHAR(255) DEFAULT NULL,
    before_state JSONB DEFAULT NULL,
    after_state JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_template_audit_log IS 'Immutable audit trail of template creations, revisions, duplicates, and status transitions.';

CREATE INDEX IF NOT EXISTS idx_template_audit_template_id ON public.notification_template_audit_log(template_id, created_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.notification_template_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_template_audit_StaffAdmin" ON public.notification_template_audit_log;
DROP POLICY IF EXISTS "INSERT_template_audit_StaffAdmin" ON public.notification_template_audit_log;

CREATE POLICY "SELECT_template_audit_StaffAdmin" ON public.notification_template_audit_log FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_template_audit_StaffAdmin" ON public.notification_template_audit_log FOR INSERT WITH CHECK (public.is_staff_rw());

-- 3. Seed Production Default Templates for all Events and Channels
INSERT INTO public.notification_templates (
    code, language_code, version, is_active, status, title, document_type, event_type, channel, category, subject_template, body_template
) VALUES
-- PASSPORT EXPIRY (Utility)
('PASSPORT_EXPIRY_ALERT', 'en', 1, true, 'ACTIVE', 'Passport Expiry Notice', 'passport', 'document_expiry', 'both', 'utility',
 'ISCMS Alert: Passport Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour passport (Enrollment: {{enrollment_number}}) is scheduled to expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease initiate the necessary renewal process in sufficient time to maintain your compliance standing.\n\nRegards,\n{{institution_name}}'),

-- VISA EXPIRY (Utility)
('VISA_EXPIRY_ALERT', 'en', 1, true, 'ACTIVE', 'Student Visa Expiry Notice', 'visa', 'document_expiry', 'both', 'utility',
 'ISCMS Alert: Student Visa Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour student visa (Enrollment: {{enrollment_number}}) will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease initiate the visa renewal or extension process before the expiration date to maintain legal academic residency.\n\nRegards,\n{{institution_name}}'),

-- eFRRO EXPIRY (Utility)
('EFRRO_EXPIRY_ALERT', 'en', 1, true, 'ACTIVE', 'eFRRO Registration Expiry Notice', 'efrro', 'document_expiry', 'both', 'utility',
 'ISCMS Alert: eFRRO / Residential Permit Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour eFRRO / Residential Permit certificate will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease submit your renewal application on the government eFRRO portal and upload your updated certificate before expiry.\n\nRegards,\n{{institution_name}}'),

-- STUDENT PORTAL OTP (Authentication)
('STUDENT_PORTAL_OTP', 'en', 1, true, 'ACTIVE', 'Student Portal Login OTP', 'general', 'portal_otp', 'both', 'authentication',
 'ISCMS Student Portal Verification Code',
 'Your ISCMS Student Portal login verification code is {{otp_code}}.\n\nThis single-use code will expire in 10 minutes. For security, never share this code with anyone.\n\nOffice of International Compliance, {{institution_name}}'),

-- DOCUMENT REPLACEMENT APPROVED (Utility)
('DOC_REPLACEMENT_APPROVED', 'en', 1, true, 'ACTIVE', 'Document Replacement Window Approved', 'all', 'replacement_approved', 'both', 'utility',
 'ISCMS Notice: Replacement Request Approved for {{document_type}}',
 'Dear {{student_name}},\n\nYour request to upload a replacement {{document_type}} has been approved by the compliance team.\n\nA secure upload window has been opened for {{upload_window_hours}} hours. Please log in to your Student Portal and upload your new document copy promptly.\n\nRegards,\n{{institution_name}}'),

-- DOCUMENT REPLACEMENT REJECTED (Utility)
('DOC_REPLACEMENT_REJECTED', 'en', 1, true, 'ACTIVE', 'Document Replacement Request Rejected', 'all', 'replacement_rejected', 'both', 'utility',
 'ISCMS Notice: Replacement Request Status for {{document_type}}',
 'Dear {{student_name}},\n\nYour document replacement request for {{document_type}} could not be approved at this time.\n\nStaff Remarks:\n{{rejection_reason}}\n\nIf you have questions, please contact the compliance office.\n\nRegards,\n{{institution_name}}'),

-- DOCUMENT VERIFICATION APPROVED (Utility)
('DOCUMENT_VERIFIED', 'en', 1, true, 'ACTIVE', 'Document Verification Approved', 'all', 'document_verified', 'both', 'utility',
 'ISCMS Notice: {{document_type}} Verification Approved',
 'Dear {{student_name}},\n\nYour uploaded {{document_type}} document has been verified and approved by the International Compliance Office. Your compliance status is now up to date.\n\nRegards,\n{{institution_name}}'),

-- DOCUMENT VERIFICATION REJECTED (Utility)
('DOCUMENT_REJECTED', 'en', 1, true, 'ACTIVE', 'Document Verification Revision Required', 'all', 'document_rejected', 'both', 'utility',
 'ISCMS Alert: Action Required on Your {{document_type}} Submission',
 'Dear {{student_name}},\n\nYour submitted {{document_type}} document could not be verified and requires correction.\n\nReason for Rejection:\n{{rejection_reason}}\n\nPlease log in to the ISCMS portal and upload a clear, legible copy.\n\nRegards,\n{{institution_name}}')

ON CONFLICT (code, language_code, version) DO UPDATE SET
    event_type = EXCLUDED.event_type,
    status = EXCLUDED.status,
    document_type = EXCLUDED.document_type,
    channel = EXCLUDED.channel,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template;

COMMIT;

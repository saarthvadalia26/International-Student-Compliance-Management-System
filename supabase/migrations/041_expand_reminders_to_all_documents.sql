-- Migration: 041_expand_reminders_to_all_documents
-- Description: Generalizes reminder rules, templates, and notifications to independently support Passport, Visa, and eFRRO.
-- Dependencies: 006_notifications.sql, 011_multilingual_templates.sql, 028_enterprise_rls_policy_standardization.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Extend notification_templates with document_type, channel, and category
ALTER TABLE public.notification_templates 
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (document_type IN ('passport', 'visa', 'efrro', 'all')),
    ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NOT NULL DEFAULT 'both' CHECK (channel IN ('email', 'whatsapp', 'both', 'sms')),
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'utility' CHECK (category IN ('utility', 'authentication', 'marketing', 'alert'));

COMMENT ON COLUMN public.notification_templates.document_type IS 'Specific document type target (passport, visa, efrro) or all.';
COMMENT ON COLUMN public.notification_templates.channel IS 'Communication provider channel target for template.';
COMMENT ON COLUMN public.notification_templates.category IS 'Message category classification (e.g. utility for expiry reminders, authentication for OTP).';

-- 2. Extend reminder_rules with rule_name and template_id
ALTER TABLE public.reminder_rules
    ADD COLUMN IF NOT EXISTS rule_name VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.reminder_rules.rule_name IS 'Descriptive name of the reminder rule (e.g. 30-Day Passport Renewal Warning).';
COMMENT ON COLUMN public.reminder_rules.template_id IS 'Optional specific notification template bound to this reminder rule.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminder_rules_doc_active ON public.reminder_rules(document_type, is_active, alert_threshold_days);
CREATE INDEX IF NOT EXISTS idx_notification_templates_doc_active ON public.notification_templates(document_type, is_active, language_code);

-- 3. Seed Default Notification Templates for Passport, Visa, and eFRRO
INSERT INTO public.notification_templates (code, language_code, version, is_active, title, document_type, channel, category, subject_template, body_template) VALUES
-- Passport Templates (English)
('PASSPORT_EXPIRY_ALERT', 'en', 1, true, 'Passport Expiry Reminder', 'passport', 'both', 'utility',
 'ISCMS Alert: Passport Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour passport (Enrollment: {{enrollment_number}}) is scheduled to expire on {{expiry_date}} ({{days_remaining}} days remaining).\n\nPlease ensure that you initiate the passport renewal process with your embassy or government authorities in sufficient time to maintain your compliance standing.\n\nBest regards,\nOffice of International Compliance\n{{institution_name}}'),

-- Visa Templates (English)
('VISA_EXPIRY_ALERT', 'en', 1, true, 'Visa Expiry Reminder', 'visa', 'both', 'utility',
 'ISCMS Alert: Student Visa Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour student visa (Enrollment: {{enrollment_number}}) will expire on {{expiry_date}} ({{days_remaining}} days remaining).\n\nPlease initiate the visa renewal or extension process before the expiration date to maintain legal academic residency.\n\nBest regards,\nOffice of International Compliance\n{{institution_name}}'),

-- eFRRO / Permit Templates (English)
('EFRRO_EXPIRY_ALERT', 'en', 1, true, 'eFRRO Registration Expiry Reminder', 'efrro', 'both', 'utility',
 'ISCMS Alert: eFRRO / Residential Permit Expiration Notice for {{student_name}}',
 'Dear {{student_name}},\n\nYour eFRRO / Residential Permit certificate will expire on {{expiry_date}} ({{days_remaining}} days remaining).\n\nPlease submit your renewal application on the government eFRRO portal and upload your updated certificate in the ISCMS portal before expiry.\n\nBest regards,\nOffice of International Compliance\n{{institution_name}}'),

-- Passport Multilingual: Hindi (hi)
('PASSPORT_EXPIRY_ALERT', 'hi', 1, true, 'पासपोर्ट समाप्ति अनुस्मारक', 'passport', 'both', 'utility',
 'ISCMS अलर्ट: {{student_name}} के लिए पासपोर्ट समाप्ति सूचना',
 'प्रिय {{student_name}},\n\nआपका पासपोर्ट {{expiry_date}} को समाप्त होने वाला है ({{days_remaining}} दिन शेष)।\n\nकृपया अनुपालन बनाए रखने के लिए समय पर अपने दूतावास से पासपोर्ट नवीनीकरण प्रक्रिया पूरी करें।\n\nसादर,\nअंतरराष्ट्रीय अनुपालन कार्यालय\n{{institution_name}}'),

-- Visa Multilingual: Hindi (hi)
('VISA_EXPIRY_ALERT', 'hi', 1, true, 'वीज़ा समाप्ति अनुस्मारक', 'visa', 'both', 'utility',
 'ISCMS अलर्ट: {{student_name}} के लिए वीज़ा समाप्ति सूचना',
 'प्रिय {{student_name}},\n\nआपका वीज़ा {{expiry_date}} को समाप्त होने वाला है ({{days_remaining}} दिन शेष)।\n\nकृपया कानूनी स्थिति बनाए रखने के लिए समाप्ति से पहले वीज़ा विस्तार प्रक्रिया शुरू करें।\n\nसादर,\nअंतरराष्ट्रीय अनुपालन कार्यालय\n{{institution_name}}'),

-- eFRRO Multilingual: Hindi (hi)
('EFRRO_EXPIRY_ALERT', 'hi', 1, true, 'eFRRO पंजीकरण समाप्ति अनुस्मारक', 'efrro', 'both', 'utility',
 'ISCMS अलर्ट: {{student_name}} के लिए eFRRO समाप्ति सूचना',
 'प्रिय {{student_name}},\n\nआपका eFRRO प्रमाण पत्र {{expiry_date}} को समाप्त हो रहा है ({{days_remaining}} दिन शेष)।\n\nकृपया eFRRO पोर्टल पर नवीनीकरण करें और नया प्रमाण पत्र ISCMS पोर्टल पर अपलोड करें।\n\nसादर,\nअंतरराष्ट्रीय अनुपालन कार्यालय\n{{institution_name}}'),

-- Passport Multilingual: Spanish (es)
('PASSPORT_EXPIRY_ALERT', 'es', 1, true, 'Recordatorio de caducidad del pasaporte', 'passport', 'both', 'utility',
 'Alerta ISCMS: Aviso de vencimiento de pasaporte de {{student_name}}',
 'Estimado/a {{student_name}},\n\nSu pasaporte vencerá el {{expiry_date}} (quedan {{days_remaining}} días).\n\nPor favor inicie el trámite de renovación con suficiente anticipación para mantener su estado de cumplimiento.\n\nAtentamente,\nOficina de Cumplimiento Internacional\n{{institution_name}}'),

-- Visa Multilingual: Spanish (es)
('VISA_EXPIRY_ALERT', 'es', 1, true, 'Recordatorio de caducidad de visa', 'visa', 'both', 'utility',
 'Alerta ISCMS: Aviso de vencimiento de visa de {{student_name}}',
 'Estimado/a {{student_name}},\n\nSu visa de estudiante vencerá el {{expiry_date}} (quedan {{days_remaining}} días).\n\nPor favor inicie el proceso de renovación de visa antes de la fecha de vencimiento.\n\nAtentamente,\nOficina de Cumplimiento Internacional\n{{institution_name}}'),

-- eFRRO Multilingual: Spanish (es)
('EFRRO_EXPIRY_ALERT', 'es', 1, true, 'Recordatorio de caducidad de eFRRO', 'efrro', 'both', 'utility',
 'Alerta ISCMS: Aviso de vencimiento de certificado eFRRO de {{student_name}}',
 'Estimado/a {{student_name}},\n\nSu certificado de registro eFRRO vencerá el {{expiry_date}} (quedan {{days_remaining}} días).\n\nPor favor envíe su solicitud de renovación y suba su nuevo certificado al portal ISCMS.\n\nAtentamente,\nOficina de Cumplimiento Internacional\n{{institution_name}}')
ON CONFLICT (code, language_code, version) DO UPDATE SET
    document_type = EXCLUDED.document_type,
    channel = EXCLUDED.channel,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template;

-- 4. Seed Standard Default Reminder Rules for Passport, Visa, and eFRRO
-- Passport Rules
INSERT INTO public.reminder_rules (document_type, alert_threshold_days, channel, is_active, rule_name) VALUES
('passport', 90, 'email', true, 'Passport 90-Day Early Warning'),
('passport', 60, 'email', true, 'Passport 60-Day Administrative Reminder'),
('passport', 30, 'both', true, 'Passport 30-Day Urgent Renewal'),
('passport', 15, 'both', true, 'Passport 15-Day Critical Alert'),
('passport', 7, 'both', true, 'Passport 7-Day Final Warning'),
('passport', -7, 'both', true, 'Passport 7-Day Overdue Notice')
ON CONFLICT DO NOTHING;

-- Visa Rules
INSERT INTO public.reminder_rules (document_type, alert_threshold_days, channel, is_active, rule_name) VALUES
('visa', 90, 'email', true, 'Visa 90-Day Early Warning'),
('visa', 60, 'email', true, 'Visa 60-Day Administrative Reminder'),
('visa', 30, 'both', true, 'Visa 30-Day Urgent Renewal'),
('visa', 15, 'both', true, 'Visa 15-Day Critical Alert'),
('visa', 7, 'both', true, 'Visa 7-Day Final Warning'),
('visa', -7, 'both', true, 'Visa 7-Day Overdue Notice')
ON CONFLICT DO NOTHING;

-- eFRRO Rules
INSERT INTO public.reminder_rules (document_type, alert_threshold_days, channel, is_active, rule_name) VALUES
('efrro', 90, 'email', true, 'eFRRO 90-Day Early Warning'),
('efrro', 60, 'email', true, 'eFRRO 60-Day Administrative Reminder'),
('efrro', 30, 'both', true, 'eFRRO 30-Day Urgent Renewal'),
('efrro', 15, 'both', true, 'eFRRO 15-Day Critical Alert'),
('efrro', 7, 'both', true, 'eFRRO 7-Day Final Warning'),
('efrro', -7, 'both', true, 'eFRRO 7-Day Overdue Notice')
ON CONFLICT DO NOTHING;

COMMIT;

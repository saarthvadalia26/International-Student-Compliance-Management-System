-- Migration: 043_disable_email_notification_channel
-- Description: Disables Email as an active delivery channel across reminder rules and notification templates.
--               Preserves historical delivery logs while setting all operational triggers to WhatsApp.
-- Dependencies: 006_notifications.sql, 041_expand_reminders_to_all_documents.sql, 042_complete_template_manager_architecture.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Update existing operational reminder rules to WhatsApp
UPDATE public.reminder_rules
SET channel = 'whatsapp',
    updated_at = now()
WHERE channel IN ('email', 'both');

-- 2. Update active operational notification templates to WhatsApp
UPDATE public.notification_templates
SET channel = 'whatsapp',
    updated_at = now()
WHERE channel IN ('email', 'both');

-- 3. Document channel state in schema comments
COMMENT ON COLUMN public.reminder_rules.channel IS 'Communication channel for reminder delivery. Currently restricted to whatsapp (email disabled until provider integration).';
COMMENT ON COLUMN public.notification_templates.channel IS 'Target delivery channel. Currently restricted to whatsapp (email disabled until provider integration).';

COMMIT;

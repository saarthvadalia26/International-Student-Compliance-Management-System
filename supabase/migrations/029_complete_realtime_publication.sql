-- Migration: 029_complete_realtime_publication.sql
-- Description: Enables Supabase Realtime publication and FULL replica identity for all 29 ISCMS database tables
--              to ensure live, instant synchronization across all administrative and staff user sessions.
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: August 5, 2026

BEGIN;

DO $$
DECLARE
  t text;
  realtime_tables text[] := ARRAY[
    'reference_data',
    'academic_programs',
    'system_config',
    'students',
    'student_personal',
    'student_contact',
    'student_academic',
    'student_relationships',
    'student_embassy',
    'passport_versions',
    'visa_versions',
    'efrro_versions',
    'student_snapshot',
    'notification_templates',
    'student_notification_preferences',
    'notifications',
    'notification_delivery_log',
    'in_app_notifications',
    'reminder_rules',
    'scheduled_jobs',
    'audit_log',
    'student_contact_audit',
    'upload_audit_log',
    'retention_policies',
    'retention_audit_log',
    'document_lifecycle_audit_log',
    'student_activity_log',
    'student_upload_tokens',
    'student_otp_verifications'
  ];
BEGIN
  -- Create publication if it does not exist
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY realtime_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      -- Set REPLICA IDENTITY FULL so PostgreSQL broadcasts complete row payloads on UPDATE & DELETE
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
      
      -- Add table to publication if not already added
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      EXCEPTION
        WHEN OTHERS THEN NULL; -- Ignore if table is already in publication
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Migration: 019_realtime_publication
-- Description: Enables Supabase Realtime publication for core ISCMS entities to support live synchronization.
-- Dependencies: 003_students.sql, 004_student_details.sql, 005_documents.sql, 006_notifications.sql, 007_reports_audit.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- Check if publication exists before configuring tables
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Add core application tables to supabase_realtime publication
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_personal;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_academic;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_contact;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_snapshot;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.passport_versions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.visa_versions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.efrro_versions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reference_data;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log exception without aborting if tables are already in publication
        RAISE NOTICE 'Notice: Tables may already be assigned to supabase_realtime publication: %', SQLERRM;
END $$;

COMMIT;

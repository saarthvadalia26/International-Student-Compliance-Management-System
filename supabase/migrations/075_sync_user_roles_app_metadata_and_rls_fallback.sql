-- Migration: 075_sync_user_roles_app_metadata_and_rls_fallback.sql
-- Description: Hardens RLS authorization helper functions (is_admin, is_staff_rw, is_staff_ro)
--              to check app_metadata, user_metadata, and fallback to public.user_profiles.
--              Ensures Supabase Realtime reliably streams table events to authenticated institutional users.
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: September 7, 2026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Resilient Authorization Helper Functions with Multi-Layer Metadata Fallback
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
      OR (auth.role() = 'service_role');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() THEN RETURN TRUE; END IF;
  
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('administrator', 'admin')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('administrator', 'admin', 'superadmin')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('administrator', 'admin')
      OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('administrator', 'admin')
      );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_rw()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() THEN RETURN TRUE; END IF;
  
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer')
      OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer')
      );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_ro()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() OR public.is_staff_rw() THEN RETURN TRUE; END IF;
  
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('read_only_staff', 'auditor')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('read_only_staff', 'auditor')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('read_only_staff', 'auditor')
      OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('read_only_staff', 'auditor')
      );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Prevent Recursive Trigger Loops & Harden Auth User Synchronization
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove any mutual recursive trigger from user_profiles to auth.users.
-- Having user_profiles trigger an UPDATE on auth.users while auth.users triggers
-- an INSERT/UPDATE on user_profiles causes an infinite recursion loop
-- (PostgreSQL error 54001: stack depth limit exceeded).
DROP TRIGGER IF EXISTS trg_sync_user_profile_app_metadata ON public.user_profiles;
DROP FUNCTION IF EXISTS public.sync_user_profile_to_auth_app_metadata();

-- Harden handle_auth_user_sync so it checks app_metadata, user_metadata,
-- and never accidentally demotes an existing administrator to staff.
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role text;
    v_raw_name text;
    v_role text := 'staff';
    v_is_complete boolean := false;
BEGIN
    v_raw_role := lower(trim(coalesce(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        ''
    )));
    v_raw_name := trim(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', ''));

    -- Explicit Role Classification for Institutional Personnel
    IF v_raw_role IN ('administrator', 'admin', 'superadmin') THEN
        v_role := 'administrator';
    ELSE
        v_role := 'staff';
    END IF;

    IF length(v_raw_name) >= 2 THEN
        v_is_complete := true;
    ELSE
        v_raw_name := NULL;
        v_is_complete := false;
    END IF;

    INSERT INTO public.user_profiles (id, email, full_name, role, is_profile_complete, updated_at)
    VALUES (
        NEW.id,
        coalesce(NEW.email, 'no-email@nfsu.ac.in'),
        v_raw_name,
        v_role,
        v_is_complete,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = coalesce(EXCLUDED.email, public.user_profiles.email),
        full_name = coalesce(EXCLUDED.full_name, public.user_profiles.full_name),
        role = CASE 
            WHEN EXCLUDED.role = 'administrator' THEN 'administrator'
            WHEN public.user_profiles.role = 'administrator' THEN 'administrator'
            ELSE EXCLUDED.role
        END,
        is_profile_complete = (EXCLUDED.full_name IS NOT NULL AND length(trim(EXCLUDED.full_name)) >= 2),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure Core Tables Have Full Replica Identity in supabase_realtime
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  tables_to_sync text[] := ARRAY[
    'students',
    'student_personal',
    'student_contact',
    'student_academic',
    'student_snapshot',
    'passport_versions',
    'visa_versions',
    'efrro_versions',
    'academic_programs',
    'schools',
    'notifications',
    'reference_data'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables_to_sync LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;

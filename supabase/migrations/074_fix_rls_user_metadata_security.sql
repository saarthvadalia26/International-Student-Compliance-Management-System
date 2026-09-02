-- Migration: 074_fix_rls_user_metadata_security.sql
-- Description: Hardens RLS policies and authorization helper functions by removing insecure
--              references to client-writable `user_metadata` and replacing them with secure
--              `app_metadata` claims and `SECURITY DEFINER` role functions.
-- Date: September 2, 2026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Update Helper Functions to use app_metadata instead of user_metadata
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
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('administrator', 'admin', 'superadmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_rw()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() THEN RETURN TRUE; END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff', 'compliance_officer');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_ro()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() OR public.is_staff_rw() THEN RETURN TRUE; END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('read_only_staff', 'auditor')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('read_only_staff', 'auditor');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix document_replacement_requests Policies (if table exists)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_replacement_requests') THEN
    DROP POLICY IF EXISTS "Allow staff manage replacement requests" ON public.document_replacement_requests;
    DROP POLICY IF EXISTS "Allow students read own replacement requests" ON public.document_replacement_requests;
    DROP POLICY IF EXISTS "Allow students insert own replacement requests" ON public.document_replacement_requests;
    DROP POLICY IF EXISTS "Allow students update own pending requests" ON public.document_replacement_requests;

    -- Staff / Admin full CRUD
    CREATE POLICY "Allow staff manage replacement requests"
        ON public.document_replacement_requests
        FOR ALL
        TO authenticated
        USING (public.is_staff_rw())
        WITH CHECK (public.is_staff_rw());

    -- Students read own replacement requests (via app_metadata student_id claim or staff read-only)
    CREATE POLICY "Allow students read own replacement requests"
        ON public.document_replacement_requests
        FOR SELECT
        TO authenticated
        USING (
            student_id::text = (auth.jwt() -> 'app_metadata' ->> 'student_id')
            OR public.is_staff_ro()
        );

    -- Students insert own replacement requests
    CREATE POLICY "Allow students insert own replacement requests"
        ON public.document_replacement_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (
            student_id::text = (auth.jwt() -> 'app_metadata' ->> 'student_id')
            OR public.is_staff_rw()
        );

    -- Students update own pending requests
    CREATE POLICY "Allow students update own pending requests"
        ON public.document_replacement_requests
        FOR UPDATE
        TO authenticated
        USING (
            public.is_staff_rw()
            OR (
                student_id::text = (auth.jwt() -> 'app_metadata' ->> 'student_id')
                AND status = 'pending'
            )
        )
        WITH CHECK (
            public.is_staff_rw()
            OR (
                student_id::text = (auth.jwt() -> 'app_metadata' ->> 'student_id')
                AND status IN ('pending', 'cancelled')
            )
        );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix import_batches Policies (if table exists)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'import_batches') THEN
    DROP POLICY IF EXISTS "Allow admin manage import batches" ON public.import_batches;
    DROP POLICY IF EXISTS "Allow staff read import batches" ON public.import_batches;

    CREATE POLICY "Allow admin manage import batches"
        ON public.import_batches
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());

    CREATE POLICY "Allow staff read import batches"
        ON public.import_batches
        FOR SELECT
        TO authenticated
        USING (public.is_staff_ro());
  END IF;
END $$;

COMMIT;

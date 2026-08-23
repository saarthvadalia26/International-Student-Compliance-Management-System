-- Migration: 054_strict_identity_isolation.sql
-- Description: Strict identity boundary enforcement between Student and Staff/Administrator lifecycles.
--              Guarantees that student authentications never default to staff roles or appear as staff.
-- Dependencies: 046_user_profiles_identity_system.sql
-- Transaction: Yes

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Redefine handle_auth_user_sync() to strictly respect user types
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role text;
    v_raw_name text;
    v_role text;
    v_is_complete boolean := false;
    v_email text;
BEGIN
    v_email := coalesce(NEW.email, '');
    v_raw_role := lower(trim(coalesce(NEW.raw_user_meta_data->>'role', '')));
    v_raw_name := trim(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', ''));

    -- Explicit Role Classification
    IF v_raw_role IN ('administrator', 'admin') THEN
        v_role := 'administrator';
    ELSIF v_raw_role = 'student' OR (NEW.raw_user_meta_data->>'student_id') IS NOT NULL OR v_email ILIKE '%@iscms.student.local' THEN
        v_role := 'student';
    ELSIF v_raw_role IN ('staff', 'operations_staff', 'international_office_staff') THEN
        v_role := 'staff';
    ELSE
        -- If no explicit role is defined and not matching student markers, default to staff for internal invites
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
        role = EXCLUDED.role,
        is_profile_complete = (EXCLUDED.full_name IS NOT NULL AND length(trim(EXCLUDED.full_name)) >= 2),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to auth.users if permissions allow
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created_sync_profile ON auth.users;
        CREATE TRIGGER on_auth_user_created_sync_profile
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping auth.users trigger attachment: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill/Correct Existing Student user_profiles
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        UPDATE public.user_profiles up
        SET role = 'student'
        FROM auth.users u
        WHERE up.id = u.id
          AND (
            u.email ILIKE '%@iscms.student.local'
            OR (u.raw_user_meta_data->>'role') = 'student'
            OR (u.raw_user_meta_data->>'student_id') IS NOT NULL
          )
          AND up.role != 'student';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping user_profiles role reconciliation: %', SQLERRM;
END $$;

COMMENT ON FUNCTION public.handle_auth_user_sync() IS 'Authoritative identity synchronization trigger separating student accounts from staff/admin accounts.';

COMMIT;

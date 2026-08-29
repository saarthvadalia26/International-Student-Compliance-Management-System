-- Migration: 068_remove_student_roles_from_identity_system.sql
-- Description: Standardizes user_profiles role constraints and sync trigger to strictly allow
--              administrative and staff personnel (eliminating obsolete student user role).
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: August 29, 2026

BEGIN;

-- 1. Update check constraint on user_profiles role
ALTER TABLE public.user_profiles 
    DROP CONSTRAINT IF EXISTS chk_user_profiles_role;

ALTER TABLE public.user_profiles 
    ADD CONSTRAINT chk_user_profiles_role 
    CHECK (role IN ('administrator', 'staff', 'admin'));

-- 2. Redefine handle_auth_user_sync() to strictly manage staff and administrators
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role text;
    v_raw_name text;
    v_role text := 'staff';
    v_is_complete boolean := false;
BEGIN
    v_raw_role := lower(trim(coalesce(NEW.raw_user_meta_data->>'role', '')));
    v_raw_name := trim(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', ''));

    -- Explicit Role Classification for Institutional Personnel
    IF v_raw_role IN ('administrator', 'admin') THEN
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
        role = EXCLUDED.role,
        is_profile_complete = (EXCLUDED.full_name IS NOT NULL AND length(trim(EXCLUDED.full_name)) >= 2),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

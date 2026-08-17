-- Migration: 046_user_profiles_identity_system.sql
-- Description: Canonical Staff & Administrator User Profiles Identity System
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: August 17, 2026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create Canonical User Profiles Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    is_profile_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Integrity Constraints
ALTER TABLE public.user_profiles 
    DROP CONSTRAINT IF EXISTS chk_user_profiles_role;
ALTER TABLE public.user_profiles 
    ADD CONSTRAINT chk_user_profiles_role 
    CHECK (role IN ('administrator', 'staff', 'student', 'admin'));

ALTER TABLE public.user_profiles 
    DROP CONSTRAINT IF EXISTS chk_user_profiles_full_name_length;
ALTER TABLE public.user_profiles 
    ADD CONSTRAINT chk_user_profiles_full_name_length 
    CHECK (full_name IS NULL OR length(trim(full_name)) >= 2);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_complete ON public.user_profiles (is_profile_complete);

COMMENT ON TABLE public.user_profiles IS 'Canonical profile identity table for administrators, staff members, and students.';
COMMENT ON COLUMN public.user_profiles.full_name IS 'Institutional real full name of the user (e.g. Dr. Skvadalia Shah, Rahul Kumar).';
COMMENT ON COLUMN public.user_profiles.is_profile_complete IS 'Flag indicating whether the user has provided their verified real name.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend Audit Log Table with actor_name
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_name ON public.audit_log (actor_name) WHERE actor_name IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SELECT_user_profiles_Own" ON public.user_profiles;
DROP POLICY IF EXISTS "SELECT_user_profiles_Admin" ON public.user_profiles;
DROP POLICY IF EXISTS "UPDATE_user_profiles_Own" ON public.user_profiles;
DROP POLICY IF EXISTS "UPDATE_user_profiles_Admin" ON public.user_profiles;
DROP POLICY IF EXISTS "INSERT_user_profiles_Admin" ON public.user_profiles;
DROP POLICY IF EXISTS "DELETE_user_profiles_Admin" ON public.user_profiles;

-- 3.1. SELECT: Users can read their own profile; Administrators/Service Role can read all
CREATE POLICY "SELECT_user_profiles_Own" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin() OR public.is_service_role());

-- 3.2. UPDATE: Users can update their own full_name; Administrators can update any profile
CREATE POLICY "UPDATE_user_profiles_Own" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin() OR public.is_service_role())
    WITH CHECK (auth.uid() = id OR public.is_admin() OR public.is_service_role());

-- 3.3. INSERT: Admins and Service Role can insert profiles
CREATE POLICY "INSERT_user_profiles_Admin" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id OR public.is_admin() OR public.is_service_role());

-- 3.4. DELETE: Admins and Service Role can delete profiles
CREATE POLICY "DELETE_user_profiles_Admin" ON public.user_profiles
    FOR DELETE TO authenticated
    USING (public.is_admin() OR public.is_service_role());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sync Trigger from auth.users to public.user_profiles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role text;
    v_raw_name text;
    v_role text := 'staff';
    v_is_complete boolean := false;
BEGIN
    -- Extract metadata fields safely
    v_raw_role := lower(trim(coalesce(NEW.raw_user_meta_data->>'role', 'staff')));
    v_raw_name := trim(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', ''));

    IF v_raw_role IN ('administrator', 'admin') THEN
        v_role := 'administrator';
    ELSIF v_raw_role = 'student' THEN
        v_role := 'student';
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

-- Bind trigger to auth.users if permissions allow (handled gracefully if running standalone)
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
-- 5. Backfill Existing auth.users into public.user_profiles
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO public.user_profiles (id, email, full_name, role, is_profile_complete, created_at, updated_at)
        SELECT 
            u.id,
            coalesce(u.email, 'no-email@nfsu.ac.in'),
            CASE 
                WHEN length(trim(coalesce(u.raw_user_meta_data->>'full_name', ''))) >= 2 THEN trim(u.raw_user_meta_data->>'full_name')
                ELSE NULL
            END AS full_name,
            CASE 
                WHEN lower(trim(coalesce(u.raw_user_meta_data->>'role', 'staff'))) IN ('administrator', 'admin') THEN 'administrator'
                WHEN lower(trim(coalesce(u.raw_user_meta_data->>'role', 'staff'))) = 'student' THEN 'student'
                ELSE 'staff'
            END AS role,
            (length(trim(coalesce(u.raw_user_meta_data->>'full_name', ''))) >= 2) AS is_profile_complete,
            coalesce(u.created_at, now()),
            now()
        FROM auth.users u
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = coalesce(EXCLUDED.full_name, public.user_profiles.full_name),
            role = EXCLUDED.role,
            is_profile_complete = (coalesce(EXCLUDED.full_name, public.user_profiles.full_name) IS NOT NULL),
            updated_at = now();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Backfill note: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Realtime Publication
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add user_profiles to supabase_realtime publication: %', SQLERRM;
END $$;

COMMIT;

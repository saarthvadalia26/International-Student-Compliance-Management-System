-- Migration: 072_profile_bank_scholarship_campus_expansion.sql
-- Description: Adds joining_date to student_academic, creates student_bank_details table,
--              creates scholarship_schemes master data table, creates campuses master data table,
--              migrates existing student academic references, and syncs visa classifications.
-- Target Institution: National Forensic Sciences University (NFSU)
-- Transaction: Yes

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Academic Profile Expansion: Add joining_date to public.student_academic
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.student_academic.joining_date IS 
    'Official date when the international student joined the university or reported on campus. Optional and nullable.';

CREATE INDEX IF NOT EXISTS idx_student_academic_joining_date 
    ON public.student_academic (joining_date) 
    WHERE joining_date IS NOT NULL AND deleted_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- Helper Trigger Function: Ensure public.update_timestamp() exists
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Sensitive Bank Details: Create public.student_bank_details table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.students (id) ON DELETE CASCADE,
    bank_name VARCHAR(255) DEFAULT NULL,
    account_number VARCHAR(100) DEFAULT NULL, -- Text to preserve leading zeroes and precision
    ifsc_code VARCHAR(50) DEFAULT NULL,
    branch_address TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON TABLE public.student_bank_details IS 
    'Sensitive banking coordinates for international students managed exclusively by authorized university administrators and staff.';
COMMENT ON COLUMN public.student_bank_details.account_number IS 
    'Bank account number stored strictly as text/string to preserve leading zeroes, arbitrary formatting, and numeric precision.';
COMMENT ON COLUMN public.student_bank_details.ifsc_code IS 
    'Indian Financial System Code (IFSC) or international branch identifier code. Optional.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_bank_details_student_id 
    ON public.student_bank_details (student_id) 
    WHERE deleted_at IS NULL;

-- Trigger: update_timestamp
DROP TRIGGER IF EXISTS trg_student_bank_details_updated_at ON public.student_bank_details;
CREATE TRIGGER trg_student_bank_details_updated_at
    BEFORE UPDATE ON public.student_bank_details
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();

-- Row Level Security (RLS)
ALTER TABLE public.student_bank_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_student_bank_details_Staff" ON public.student_bank_details;
DROP POLICY IF EXISTS "INSERT_student_bank_details_Staff" ON public.student_bank_details;
DROP POLICY IF EXISTS "UPDATE_student_bank_details_Staff" ON public.student_bank_details;
DROP POLICY IF EXISTS "DELETE_student_bank_details_Admin" ON public.student_bank_details;

CREATE POLICY "SELECT_student_bank_details_Staff" ON public.student_bank_details
    FOR SELECT USING (public.is_staff_ro());

CREATE POLICY "INSERT_student_bank_details_Staff" ON public.student_bank_details
    FOR INSERT WITH CHECK (public.is_staff_rw());

CREATE POLICY "UPDATE_student_bank_details_Staff" ON public.student_bank_details
    FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());

CREATE POLICY "DELETE_student_bank_details_Admin" ON public.student_bank_details
    FOR DELETE USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Scholarship Schemes Master Data: Create public.scholarship_schemes table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scholarship_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    CONSTRAINT chk_scholarship_scheme_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.scholarship_schemes IS 
    'Centrally managed master data of scholarship schemes (e.g. ICCR, SII, Africa Scholarship Scheme) for international student funding.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scholarship_schemes_active 
    ON public.scholarship_schemes (is_active) 
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scholarship_schemes_name 
    ON public.scholarship_schemes (name);
CREATE INDEX IF NOT EXISTS idx_scholarship_schemes_order 
    ON public.scholarship_schemes (display_order, name);

-- Trigger: update_timestamp
DROP TRIGGER IF EXISTS trg_scholarship_schemes_updated_at ON public.scholarship_schemes;
CREATE TRIGGER trg_scholarship_schemes_updated_at
    BEFORE UPDATE ON public.scholarship_schemes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();

-- Row Level Security (RLS)
ALTER TABLE public.scholarship_schemes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_scholarship_schemes_Public" ON public.scholarship_schemes;
DROP POLICY IF EXISTS "INSERT_scholarship_schemes_Admin" ON public.scholarship_schemes;
DROP POLICY IF EXISTS "UPDATE_scholarship_schemes_Admin" ON public.scholarship_schemes;
DROP POLICY IF EXISTS "DELETE_scholarship_schemes_Admin" ON public.scholarship_schemes;

CREATE POLICY "SELECT_scholarship_schemes_Public" ON public.scholarship_schemes
    FOR SELECT USING (true);

CREATE POLICY "INSERT_scholarship_schemes_Admin" ON public.scholarship_schemes
    FOR INSERT WITH CHECK (public.is_staff_rw());

CREATE POLICY "UPDATE_scholarship_schemes_Admin" ON public.scholarship_schemes
    FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());

CREATE POLICY "DELETE_scholarship_schemes_Admin" ON public.scholarship_schemes
    FOR DELETE USING (public.is_admin());

-- Seed standard scholarship schemes
INSERT INTO public.scholarship_schemes (name, code, description, display_order, is_active)
VALUES
    ('Silver Jubilee Scholarship Scheme', 'SJSS', 'ICCR Silver Jubilee Scholarship Scheme for international postgraduates and researchers', 1, true),
    ('Africa Scholarship Scheme', 'ASS', 'ICCR Special Scholarship Scheme for African nationals', 2, true),
    ('General Scholarship Scheme (GSS)', 'GSS', 'ICCR General Scholarship Scheme for undergraduate and postgraduate studies', 3, true),
    ('Study in India (SII) Scholarship', 'SII', 'Government of India Study in India flagship financial assistance scholarship', 4, true),
    ('Commonwealth Scholarship Plan', 'CSP', 'Commonwealth Scholarship and Fellowship Plan for international candidates', 5, true),
    ('Cultural Exchange Programme (CEP)', 'CEP', 'Bilateral Cultural Exchange Programme scholarship', 6, true),
    ('Mekong-Ganga Cooperation (MGC) Scheme', 'MGC', 'ICCR Scholarship Scheme for MGC member countries', 7, true),
    ('Foreign Government Sponsored', 'FGS', 'Direct bilateral sponsorship by foreign partner governments', 8, true)
ON CONFLICT (name) DO NOTHING;

-- Data Migration: Migrate any distinct non-null scholarship scheme names from student_academic
INSERT INTO public.scholarship_schemes (name, description, display_order, is_active)
SELECT DISTINCT TRIM(iccr_scholarship_scheme_name), 'Migrated from legacy student academic records', 99, true
FROM public.student_academic
WHERE iccr_scholarship_scheme_name IS NOT NULL 
  AND TRIM(iccr_scholarship_scheme_name) <> ''
  AND TRIM(iccr_scholarship_scheme_name) NOT IN (SELECT name FROM public.scholarship_schemes)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NFSU Campuses Master Data: Create public.campuses table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    CONSTRAINT chk_campuses_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.campuses IS 
    'Centrally managed master data of National Forensic Sciences University (NFSU) campuses across India and abroad.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_campuses_active 
    ON public.campuses (is_active) 
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campuses_name 
    ON public.campuses (name);
CREATE INDEX IF NOT EXISTS idx_campuses_order 
    ON public.campuses (display_order, name);

-- Trigger: update_timestamp
DROP TRIGGER IF EXISTS trg_campuses_updated_at ON public.campuses;
CREATE TRIGGER trg_campuses_updated_at
    BEFORE UPDATE ON public.campuses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();

-- Row Level Security (RLS)
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_campuses_Public" ON public.campuses;
DROP POLICY IF EXISTS "INSERT_campuses_Admin" ON public.campuses;
DROP POLICY IF EXISTS "UPDATE_campuses_Admin" ON public.campuses;
DROP POLICY IF EXISTS "DELETE_campuses_Admin" ON public.campuses;

CREATE POLICY "SELECT_campuses_Public" ON public.campuses
    FOR SELECT USING (true);

CREATE POLICY "INSERT_campuses_Admin" ON public.campuses
    FOR INSERT WITH CHECK (public.is_staff_rw());

CREATE POLICY "UPDATE_campuses_Admin" ON public.campuses
    FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());

CREATE POLICY "DELETE_campuses_Admin" ON public.campuses
    FOR DELETE USING (public.is_admin());

-- Seed standard canonical NFSU campuses across India and international
INSERT INTO public.campuses (name, code, location, display_order, is_active)
VALUES
    ('Gandhinagar Main Campus', 'NFSU-GN', 'Gandhinagar, Gujarat, India', 1, true),
    ('Delhi Campus', 'NFSU-DL', 'Rohini, New Delhi, India', 2, true),
    ('Goa Campus', 'NFSU-GA', 'Ponda, Goa, India', 3, true),
    ('Tripura Campus', 'NFSU-TR', 'Agartala, Tripura, India', 4, true),
    ('Bhopal Campus', 'NFSU-MP', 'Bhopal, Madhya Pradesh, India', 5, true),
    ('Pune Campus', 'NFSU-MH', 'Pune, Maharashtra, India', 6, true),
    ('Dharwad Campus', 'NFSU-KA', 'Dharwad, Karnataka, India', 7, true),
    ('Guwahati Campus', 'NFSU-AS', 'Guwahati, Assam, India', 8, true),
    ('Manipur Campus', 'NFSU-MN', 'Imphal, Manipur, India', 9, true),
    ('Uganda International Campus', 'NFSU-UG', 'Jinja, Uganda', 10, true)
ON CONFLICT (name) DO NOTHING;

-- Data Migration: Migrate any distinct non-null campuses from student_academic
INSERT INTO public.campuses (name, location, display_order, is_active)
SELECT DISTINCT TRIM(nfsu_campus), 'Migrated campus location', 99, true
FROM public.student_academic
WHERE nfsu_campus IS NOT NULL 
  AND TRIM(nfsu_campus) <> ''
  AND TRIM(nfsu_campus) NOT IN (SELECT name FROM public.campuses)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Visa Classification Reference Data Synchronization & Typo Correction
-- ─────────────────────────────────────────────────────────────────────────────

-- Correct historical typos (e.g. 'Reasearch' -> 'Research (R-1)') in document versions and snapshots
UPDATE public.student_document_versions
SET visa_type = 'Research (R-1)'
WHERE visa_type ILIKE 'reasearch%' OR visa_type = 'Research';

UPDATE public.student_snapshot
SET visa_type = 'Research (R-1)'
WHERE visa_type ILIKE 'reasearch%' OR visa_type = 'Research';

-- Ensure reference_data has entries for all standard visa classifications
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
VALUES
    ('visa_type', 'STUDENT_S1', 'Student (S-1)', 'Standard Higher Education Student Visa (S-1)', 1, true),
    ('visa_type', 'STUDENT_S2', 'Student (S-2)', 'School Education / Preparatory Student Visa (S-2)', 2, true),
    ('visa_type', 'STUDENT_S3', 'Student (S-3)', 'Short-Term / Exchange Student Visa (S-3)', 3, true),
    ('visa_type', 'STUDENT_S4', 'Student (S-4)', 'Vocational / Technical Training Student Visa (S-4)', 4, true),
    ('visa_type', 'STUDENT_S5', 'Student (S-5)', 'Special / Language / Cultural Study Visa (S-5)', 5, true),
    ('visa_type', 'RESEARCH_R1', 'Research (R-1)', 'Full-Time Research Scholar Visa (R-1)', 6, true),
    ('visa_type', 'INTERN_I1', 'Intern (I-1)', 'Institutional / University Intern Visa (I-1)', 7, true),
    ('visa_type', 'OTHER_VISA', 'Other Category', 'Other Official or Specialized Visa Category', 8, true)
ON CONFLICT (code) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    is_active = true,
    updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Realtime Publication Updates
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.student_bank_details;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.scholarship_schemes;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.campuses;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

COMMIT;

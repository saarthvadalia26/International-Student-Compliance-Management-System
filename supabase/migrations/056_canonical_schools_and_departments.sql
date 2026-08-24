-- Migration: 056_canonical_schools_and_departments
-- Description: Establishes canonical schools/departments master table, associates academic programs
--              to schools via foreign key (academic_programs.school_id), supports administrative
--              school overrides on student_academic, and safely backfills relational mappings.
-- Dependencies: 025_academic_programs.sql, 050_academic_program_integrity.sql, 055_standardize_academic_program_identity.sql
-- Transaction: Yes

BEGIN;

-- 1. Create canonical schools master table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT NULL,

    CONSTRAINT chk_schools_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.schools IS 'Canonical School / Department master data table establishing the authoritative academic hierarchy.';
COMMENT ON COLUMN public.schools.id IS 'UUID primary key generated via gen_random_uuid().';
COMMENT ON COLUMN public.schools.name IS 'Authoritative full official school/department title.';
COMMENT ON COLUMN public.schools.code IS 'Unique alphanumeric school abbreviation / code (e.g. SPES, SFS, SCSDF).';
COMMENT ON COLUMN public.schools.display_order IS 'Ordering sequence for UI selection and reporting.';
COMMENT ON COLUMN public.schools.is_active IS 'Active status flag enabling soft archiving.';

-- 2. Create Performance Indexes for schools
CREATE INDEX IF NOT EXISTS idx_schools_active ON public.schools (is_active);
CREATE INDEX IF NOT EXISTS idx_schools_order ON public.schools (display_order, name);
CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools (code);
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools (name);

-- 3. Row-Level Security (RLS) Policies on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SELECT_schools_Public" ON public.schools;
DROP POLICY IF EXISTS "INSERT_schools_Admin" ON public.schools;
DROP POLICY IF EXISTS "UPDATE_schools_Admin" ON public.schools;
DROP POLICY IF EXISTS "DELETE_schools_Admin" ON public.schools;

CREATE POLICY "SELECT_schools_Public" ON public.schools 
    FOR SELECT USING (true);

CREATE POLICY "INSERT_schools_Admin" ON public.schools 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "UPDATE_schools_Admin" ON public.schools 
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "DELETE_schools_Admin" ON public.schools 
    FOR DELETE USING (public.is_admin());

-- 4. Seed University Canonical Schools & Departments
INSERT INTO public.schools (name, code, description, display_order, is_active)
VALUES
    ('School of Pharmacy & Emerging Sciences', 'SPES', 'Pharmaceutical sciences, toxicology, and emergent clinical disciplines.', 1, true),
    ('School of Forensic Sciences', 'SFS', 'Forensic sciences, physical evidence, and forensic chemistry/biology.', 2, true),
    ('School of Cyber Security & Digital Forensics', 'SCSDF', 'Information security, digital investigations, incident response, and cyber forensics.', 3, true),
    ('School of Police Science & Security Studies', 'SPSSS', 'Law enforcement administration, internal security, and police sciences.', 4, true),
    ('School of Management Studies', 'SMS', 'Cyber business administration and security management.', 5, true),
    ('School of Criminology & Behavioral Sciences', 'SCBS', 'Criminology, penology, and investigative behavioral psychology.', 6, true),
    ('School of Engineering & Technology', 'SET', 'Computer science, artificial intelligence, and applied engineering.', 7, true),
    ('Doctoral Research Programme', 'DRP', 'Doctoral research, doctoral studies, and interdisciplinary fellowships.', 8, true)
ON CONFLICT (name) DO UPDATE SET
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 5. Add school_id column to public.academic_programs if not already present
ALTER TABLE public.academic_programs 
    ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_academic_programs_school_id 
    ON public.academic_programs (school_id);

-- 6. Backfill academic_programs.school_id by matching existing school_name to schools.name
UPDATE public.academic_programs ap
SET school_id = s.id
FROM public.schools s
WHERE ap.school_id IS NULL
  AND (
      LOWER(TRIM(ap.school_name)) = LOWER(TRIM(s.name))
      OR (ap.school_name ILIKE '%Pharmacy%' AND s.code = 'SPES')
      OR (ap.school_name ILIKE '%Forensic Science%' AND s.code = 'SFS')
      OR (ap.school_name ILIKE '%Cyber Security%' AND s.code = 'SCSDF')
      OR (ap.school_name ILIKE '%Police%' AND s.code = 'SPSSS')
      OR (ap.school_name ILIKE '%Management%' AND s.code = 'SMS')
      OR (ap.school_name ILIKE '%Criminology%' AND s.code = 'SCBS')
      OR (ap.school_name ILIKE '%Engineering%' AND s.code = 'SET')
      OR (ap.school_name ILIKE '%Doctoral%' AND s.code = 'DRP')
  );

-- 7. Add administrative override fields to public.student_academic
ALTER TABLE public.student_academic 
    ADD COLUMN IF NOT EXISTS override_school_id UUID REFERENCES public.schools (id) ON DELETE SET NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS school_override_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_student_academic_override_school_id 
    ON public.student_academic (override_school_id);

COMMENT ON COLUMN public.student_academic.override_school_id IS 'Optional administrative override foreign key to public.schools. Used only for exceptional student cases differing from the canonical program school.';
COMMENT ON COLUMN public.student_academic.school_override_reason IS 'Mandatory administrative justification when override_school_id is set.';

-- 8. Add realtime publication for schools table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'schools'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
        END IF;
    END IF;
END $$;

COMMIT;

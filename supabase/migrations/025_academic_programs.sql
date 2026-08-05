-- Migration: 025_academic_programs
-- Description: Creates academic_programs table for administrator-managed master data.
-- Dependencies: 001_initial_schema.sql
-- Transaction: Yes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_name VARCHAR(255) NOT NULL UNIQUE,
    program_code VARCHAR(50),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    school_name VARCHAR(255),
    academic_level VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_programs_active ON public.academic_programs (is_active);
CREATE INDEX IF NOT EXISTS idx_programs_order ON public.academic_programs (display_order, program_name);

COMMENT ON TABLE public.academic_programs IS 'Master data table storing university academic programs managed by system administrators.';

-- Seed default initial academic programs for National Forensic Sciences University (NFSU)
INSERT INTO public.academic_programs (program_name, program_code, display_order, is_active, academic_level)
VALUES
    ('B.Tech in Computer Science & Engineering', 'BTECH_CSE', 1, true, 'UG'),
    ('B.Tech in AI & Data Science', 'BTECH_AIDS', 2, true, 'UG'),
    ('B.Sc. in Forensic Science', 'BSC_FS', 3, true, 'UG'),
    ('M.Sc. in Digital Forensics & Information Security', 'MSC_DFIS', 4, true, 'PG'),
    ('M.Tech in Cyber Security', 'MTECH_CS', 5, true, 'PG'),
    ('Master of Business Administration (Cyber Security)', 'MBA_CS', 6, true, 'PG'),
    ('Doctor of Philosophy (Ph.D.)', 'PHD', 7, true, 'PhD')
ON CONFLICT (program_name) DO NOTHING;

COMMIT;

-- Migration: 050_academic_program_integrity
-- Description: Establishes complete canonical academic programs, adds relational program_id to student_academic,
--              and performs deterministic backfill for student records.
-- Version: v0.2.0
-- Transaction: Yes.

BEGIN;

-- 1. Ensure public.academic_programs contains all standard university academic programs with complete names, codes, levels, and schools
INSERT INTO public.academic_programs (
    program_name,
    program_code,
    academic_level,
    school_name,
    total_semesters,
    semester_duration,
    semester_duration_unit,
    duration_value,
    duration_unit,
    display_order,
    is_active
)
VALUES
    -- Postgraduate (PG) Programs
    ('M. Sc. Toxicology', 'MSC-TOX', 'PG', 'School of Pharmacy & Emerging Sciences', 4, 6, 'months', 2, 'Years', 1, true),
    ('M. Sc. Forensic Science', 'MSC-FS', 'PG', 'School of Forensic Sciences', 4, 6, 'months', 2, 'Years', 2, true),
    ('M. Sc. Cyber Security', 'MSC-CS', 'PG', 'School of Cyber Security & Digital Forensics', 4, 6, 'months', 2, 'Years', 3, true),
    ('M.Sc. in Digital Forensics & Information Security', 'MSC-DFIS', 'PG', 'School of Cyber Security & Digital Forensics', 4, 6, 'months', 2, 'Years', 4, true),
    ('M.Tech in Cyber Security', 'MTECH-CS', 'PG', 'School of Cyber Security & Digital Forensics', 4, 6, 'months', 2, 'Years', 5, true),
    ('M.A. Police & Security Studies', 'MA-PSS', 'PG', 'School of Police Science & Security Studies', 4, 6, 'months', 2, 'Years', 6, true),
    ('Master of Business Administration (Cyber Security)', 'MBA-CS', 'PG', 'School of Management Studies', 4, 6, 'months', 2, 'Years', 7, true),

    -- Undergraduate (UG) Programs
    ('B.Sc. Criminology', 'BSC-CRIM', 'UG', 'School of Criminology & Behavioral Sciences', 6, 6, 'months', 3, 'Years', 8, true),
    ('B.Sc. in Forensic Science', 'BSC-FS', 'UG', 'School of Forensic Sciences', 6, 6, 'months', 3, 'Years', 9, true),
    ('B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'UG', 'School of Engineering & Technology', 8, 6, 'months', 4, 'Years', 10, true),
    ('B.Tech in AI & Data Science', 'BTECH-AIDS', 'UG', 'School of Engineering & Technology', 8, 6, 'months', 4, 'Years', 11, true),

    -- Integrated (UG + PG) Programs
    ('Integrated B.A. + M.A. Criminology', 'INT-BA-MA-CRIM', 'INTEGRATED', 'School of Criminology & Behavioral Sciences', 10, 6, 'months', 5, 'Years', 12, true),
    ('B.Tech + M.Tech in Computer Science & Engineering', 'BTECH-MTECH-CSE', 'INTEGRATED', 'School of Engineering & Technology', 10, 6, 'months', 5, 'Years', 13, true),

    -- Doctorate (PhD) Programs
    ('Doctor of Philosophy (Ph.D.)', 'PHD', 'PhD', 'Doctoral Research Programme', 6, 6, 'months', 3, 'Years', 14, true),

    -- Diploma / Certificate Programs
    ('Post Graduate Diploma in Fingerprint Science', 'PGD-FPS', 'Diploma', 'School of Forensic Sciences', 2, 6, 'months', 1, 'Years', 15, true),
    ('Post Graduate Diploma in Forensic Document Examination', 'PGD-FDE', 'Diploma', 'School of Forensic Sciences', 2, 6, 'months', 1, 'Years', 16, true)
ON CONFLICT (program_name) DO UPDATE
SET 
    program_code = EXCLUDED.program_code,
    academic_level = EXCLUDED.academic_level,
    school_name = EXCLUDED.school_name,
    total_semesters = EXCLUDED.total_semesters,
    semester_duration = EXCLUDED.semester_duration,
    semester_duration_unit = EXCLUDED.semester_duration_unit,
    duration_value = EXCLUDED.duration_value,
    duration_unit = EXCLUDED.duration_unit,
    is_active = true,
    updated_at = now();

-- 2. Ensure program_id column exists on student_academic with foreign key reference
ALTER TABLE public.student_academic 
    ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_academic_program_id 
    ON public.student_academic(program_id);

-- 3. Perform safe, deterministic backfill for student_academic rows where program_id is NULL
-- Match exact program_code (case-insensitive)
UPDATE public.student_academic sa
SET 
    program_id = ap.id,
    program_code = ap.program_code
FROM public.academic_programs ap
WHERE sa.program_id IS NULL
  AND sa.program_code IS NOT NULL
  AND (
      UPPER(TRIM(sa.program_code)) = UPPER(TRIM(ap.program_code))
      OR UPPER(TRIM(sa.program_code)) = UPPER(TRIM(ap.program_name))
      OR REPLACE(UPPER(TRIM(sa.program_code)), '_', '-') = REPLACE(UPPER(TRIM(ap.program_code)), '_', '-')
  );

-- 4. Document columns and relationships
COMMENT ON COLUMN public.student_academic.program_id IS 'Foreign key reference to authoritative academic_programs table.';
COMMENT ON COLUMN public.student_academic.program_code IS 'Canonical academic program code matching academic_programs.program_code. Preserved for backward compatibility.';

COMMIT;

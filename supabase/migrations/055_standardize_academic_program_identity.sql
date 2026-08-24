-- Migration: 055_standardize_academic_program_identity
-- Description: Establishes comprehensive canonical academic programs, provides deterministic legacy alias resolution,
--              and normalizes student_academic records to reference canonical program_id and program_code.
-- Version: v0.2.0
-- Transaction: Yes.

BEGIN;

-- 1. Ensure all standard university academic programs exist in public.academic_programs with complete canonical names, codes, levels, and schools
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
    ('M.Sc. Food Technology', 'MSC-FOOD', 'PG', 'School of Pharmacy & Emerging Sciences', 4, 6, 'months', 2, 'Years', 8, true),
    ('M.Sc. Forensic Biotechnology & Bioinformatics', 'MSC-BBI', 'PG', 'School of Forensic Sciences', 4, 6, 'months', 2, 'Years', 9, true),
    ('M.A. Criminology', 'MA-CRIM', 'PG', 'School of Criminology & Behavioral Sciences', 4, 6, 'months', 2, 'Years', 10, true),
    ('M.A. Police Administration', 'MA-PRA', 'PG', 'School of Police Science & Security Studies', 4, 6, 'months', 2, 'Years', 11, true),

    -- Undergraduate (UG) Programs
    ('B.Sc. Criminology', 'BSC-CRIM', 'UG', 'School of Criminology & Behavioral Sciences', 6, 6, 'months', 3, 'Years', 12, true),
    ('B.Sc. in Forensic Science', 'BSC-FS', 'UG', 'School of Forensic Sciences', 6, 6, 'months', 3, 'Years', 13, true),
    ('B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'UG', 'School of Engineering & Technology', 8, 6, 'months', 4, 'Years', 14, true),
    ('B.Tech in AI & Data Science', 'BTECH-AIDS', 'UG', 'School of Engineering & Technology', 8, 6, 'months', 4, 'Years', 15, true),

    -- Integrated (UG + PG) Programs
    ('Integrated B.A. + M.A. Criminology', 'INT-BA-MA-CRIM', 'INTEGRATED', 'School of Criminology & Behavioral Sciences', 10, 6, 'months', 5, 'Years', 16, true),
    ('B.Tech + M.Tech in Computer Science & Engineering', 'BTECH-MTECH-CSE', 'INTEGRATED', 'School of Engineering & Technology', 10, 6, 'months', 5, 'Years', 17, true),

    -- Doctorate (PhD) Programs
    ('Doctor of Philosophy (Ph.D.)', 'PHD', 'PhD', 'Doctoral Research Programme', 6, 6, 'months', 3, 'Years', 18, true),

    -- Diploma / Certificate Programs
    ('Post Graduate Diploma in Fingerprint Science', 'PGD-FPS', 'Diploma', 'School of Forensic Sciences', 2, 6, 'months', 1, 'Years', 19, true),
    ('Post Graduate Diploma in Forensic Document Examination', 'PGD-FDE', 'Diploma', 'School of Forensic Sciences', 2, 6, 'months', 1, 'Years', 20, true)
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

-- 2. Stage 1 Backfill: Match exact program_code (case-insensitive, hyphen/underscore normalization)
UPDATE public.student_academic sa
SET 
    program_id = ap.id,
    program_code = ap.program_code
FROM public.academic_programs ap
WHERE sa.program_id IS NULL
  AND sa.program_code IS NOT NULL
  AND (
      UPPER(TRIM(sa.program_code)) = UPPER(TRIM(ap.program_code))
      OR REPLACE(UPPER(TRIM(sa.program_code)), '_', '-') = REPLACE(UPPER(TRIM(ap.program_code)), '_', '-')
      OR REPLACE(UPPER(TRIM(sa.program_code)), '-', '_') = REPLACE(UPPER(TRIM(ap.program_code)), '-', '_')
  );

-- 3. Stage 2 Backfill: Match exact or normalized program_name
UPDATE public.student_academic sa
SET 
    program_id = ap.id,
    program_code = ap.program_code
FROM public.academic_programs ap
WHERE sa.program_id IS NULL
  AND sa.program_code IS NOT NULL
  AND (
      UPPER(TRIM(sa.program_code)) = UPPER(TRIM(ap.program_name))
      OR UPPER(REPLACE(REPLACE(TRIM(sa.program_code), '.', ''), ' ', '')) = UPPER(REPLACE(REPLACE(TRIM(ap.program_name), '.', ''), ' ', ''))
  );

-- 4. Stage 3 Backfill: Deterministic Legacy Aliases and Acronyms
-- M.A. Police & Security Studies (MA-PSS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MA-PSS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MAPSS', 'MA_PSS', 'MA-PSS', 'MAPSS-CODE', 'M.A. POLICE & SECURITY STUDIES', 'MA POLICE & SECURITY STUDIES');

-- M.Sc. Toxicology (MSC-TOX)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-TOX'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MSC-TOX', 'MSC_TOX', 'MSCTOX', 'M. SC. TOXICOLOGY', 'M.SC. TOXICOLOGY', 'M.SC TOXICOLOGY', 'MSC TOXICOLOGY');

-- M.Sc. Food Technology (MSC-FOOD)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-FOOD'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('M.SC. FOOD', 'M. SC. FOOD', 'MSC. FOOD', 'MSC-FOOD', 'MSC_FOOD', 'MSC-FOOD-TECH', 'FOOD', 'M.SC. FOOD TECHNOLOGY');

-- M.Sc. Forensic Biotechnology & Bioinformatics (MSC-BBI)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-BBI'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MBBI', 'MSC_BBI', 'MSC-BBI', 'MBBI-CODE', 'M.SC. BIOINFORMATICS', 'M.SC. FORENSIC BIOTECHNOLOGY');

-- M.A. Criminology (MA-CRIM)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MA-CRIM'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MAC', 'MA_CRIM', 'MA-CRIM', 'MAC-CODE', 'M.A. CRIMINOLOGY', 'MA CRIMINOLOGY');

-- M.A. Police Administration (MA-PRA)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MA-PRA'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MPRA', 'MA_PRA', 'MA-PRA', 'MPRA-CODE', 'M.A. POLICE ADMINISTRATION', 'MA POLICE ADMINISTRATION');

-- M. Sc. Forensic Science (MSC-FS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-FS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MSC-FS', 'MSC_FS', 'MSCFS', 'M. SC. FORENSIC SCIENCE', 'M.SC. FORENSIC SCIENCE', 'M.SC FORENSIC SCIENCE');

-- M. Sc. Cyber Security (MSC-CS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-CS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MSC-CS', 'MSC_CS', 'MSCCS', 'M. SC. CYBER SECURITY', 'M.SC. CYBER SECURITY', 'M.SC CYBER SECURITY');

-- M.Sc. in Digital Forensics & Information Security (MSC-DFIS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MSC-DFIS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MSC-DFIS', 'MSC_DFIS', 'MSCDFIS', 'M.SC. IN DIGITAL FORENSICS & INFORMATION SECURITY', 'MSC DIGITAL FORENSICS');

-- M.Tech in Cyber Security (MTECH-CS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MTECH-CS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MTECH-CS', 'MTECH_CS', 'MTECHCS', 'M.TECH IN CYBER SECURITY', 'MTECH CYBER SECURITY');

-- Master of Business Administration (Cyber Security) (MBA-CS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'MBA-CS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('MBA-CS', 'MBA_CS', 'MBACS', 'MASTER OF BUSINESS ADMINISTRATION (CYBER SECURITY)', 'MBA CYBER SECURITY');

-- B.Tech in Computer Science & Engineering (BTECH-CSE)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'BTECH-CSE'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('BTECH-CSE', 'BTECH_CSE', 'BTECHCSE', 'B.TECH IN COMPUTER SCIENCE & ENGINEERING', 'BTECH CSE');

-- B.Tech in AI & Data Science (BTECH-AIDS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'BTECH-AIDS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('BTECH-AIDS', 'BTECH_AIDS', 'BTECHAIDS', 'B.TECH IN AI & DATA SCIENCE', 'BTECH AI & DATA SCIENCE');

-- B.Sc. in Forensic Science (BSC-FS)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'BSC-FS'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('BSC-FS', 'BSC_FS', 'BSCFS', 'B.SC. IN FORENSIC SCIENCE', 'BSC FORENSIC SCIENCE');

-- B.Sc. Criminology (BSC-CRIM)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'BSC-CRIM'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('BSC-CRIM', 'BSC_CRIM', 'BSCCRIM', 'B.SC. CRIMINOLOGY', 'BSC CRIMINOLOGY');

-- Integrated B.A. + M.A. Criminology (INT-BA-MA-CRIM)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'INT-BA-MA-CRIM'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('INT-BA-MA-CRIM', 'INT_BA_MA_CRIM', 'INTEGRATED B.A. + M.A. CRIMINOLOGY');

-- B.Tech + M.Tech in Computer Science & Engineering (BTECH-MTECH-CSE)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'BTECH-MTECH-CSE'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('BTECH-MTECH-CSE', 'BTECH_MTECH_CSE', 'BTECH+MTECH', 'B.TECH + M.TECH IN COMPUTER SCIENCE & ENGINEERING');

-- Doctor of Philosophy (Ph.D.) (PHD)
UPDATE public.student_academic sa
SET program_id = ap.id, program_code = ap.program_code
FROM public.academic_programs ap
WHERE ap.program_code = 'PHD'
  AND (sa.program_id IS NULL OR sa.program_code != ap.program_code)
  AND UPPER(TRIM(sa.program_code)) IN ('PHD', 'PH.D.', 'DOCTOR OF PHILOSOPHY', 'DOCTOR OF PHILOSOPHY (PH.D.)');

-- 5. Add index on lower(program_code) for fast resolution
CREATE INDEX IF NOT EXISTS idx_academic_programs_code_lower 
    ON public.academic_programs(lower(program_code));

COMMIT;

-- Migration: 048_progressive_student_registration.sql
-- Description: Supports progressive / incomplete student registration in ISCMS.
--              Makes student_academic.program_code nullable so student records can be created
--              with initial available biographical details before academic course allocation.
-- Transaction: Yes

BEGIN;

-- 1. Make program_code nullable in student_academic table
ALTER TABLE public.student_academic ALTER COLUMN program_code DROP NOT NULL;

-- 2. Ensure program_code is either NULL or a non-empty string
ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS chk_academic_program_code_not_empty;
ALTER TABLE public.student_academic ADD CONSTRAINT chk_academic_program_code_not_empty 
    CHECK (program_code IS NULL OR length(trim(program_code)) > 0);

-- 3. Document architectural intent
COMMENT ON COLUMN public.student_academic.program_code IS 'Reference lookup for academic program code. Nullable to support progressive student registration prior to course allocation.';

COMMIT;

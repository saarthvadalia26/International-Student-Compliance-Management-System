-- Migration: 040_university_controlled_enrollment_number.sql
-- Description: Makes students.registration_number nullable so ISCMS never auto-generates enrollment numbers.
--              Enrollment numbers are university-generated and externally controlled.
--              Preserves unique index for active non-null enrollment numbers.
-- Transaction: Yes

BEGIN;

-- 1. Make registration_number nullable in students table
ALTER TABLE public.students ALTER COLUMN registration_number DROP NOT NULL;

-- 2. Update check constraint to allow NULL while disallowing empty/whitespace-only strings
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS chk_registration_number_not_empty;
ALTER TABLE public.students ADD CONSTRAINT chk_registration_number_not_empty 
    CHECK (registration_number IS NULL OR length(trim(registration_number)) > 0);

-- 3. Drop existing unique constraint if present and create partial unique index
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS unique_registration_number;
DROP INDEX IF EXISTS public.idx_students_reg_num_search;
DROP INDEX IF EXISTS public.students_active_idx;

-- Partial unique index: enforces uniqueness only among active records where registration_number IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_registration_number 
    ON public.students (registration_number) 
    WHERE deleted_at IS NULL AND registration_number IS NOT NULL;

-- Search index for fast lookup of non-null enrollment numbers
CREATE INDEX IF NOT EXISTS idx_students_reg_num_search 
    ON public.students (registration_number) 
    WHERE deleted_at IS NULL AND registration_number IS NOT NULL;

-- 4. Document architectural ownership
COMMENT ON COLUMN public.students.registration_number IS 'University-controlled enrollment number. Nullable when not yet provided by the university. ISCMS never auto-generates or modifies this value.';

COMMIT;

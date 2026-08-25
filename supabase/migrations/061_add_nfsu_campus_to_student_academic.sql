-- Migration: 061_add_nfsu_campus_to_student_academic
-- Description: Adds canonical nfsu_campus column to public.student_academic,
--              creates performance index, and documents column metadata.
-- Dependencies: 004_student_details.sql, 053_student_registration_expansion.sql, 060_admission_category_optional_app_numbers.sql
-- Transaction: Yes

BEGIN;

-- 1. Add nfsu_campus column to student_academic
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS nfsu_campus VARCHAR(255) DEFAULT NULL;

-- 2. Create performance index for fast campus filtering and lookup
CREATE INDEX IF NOT EXISTS idx_student_academic_nfsu_campus 
    ON public.student_academic (nfsu_campus) 
    WHERE nfsu_campus IS NOT NULL AND deleted_at IS NULL;

-- 3. Document column metadata
COMMENT ON COLUMN public.student_academic.nfsu_campus IS 
    'National Forensic Sciences University (NFSU) campus where the international student is studying (e.g., Delhi Campus, Gandhinagar Campus). Manually entered and optional.';

COMMIT;

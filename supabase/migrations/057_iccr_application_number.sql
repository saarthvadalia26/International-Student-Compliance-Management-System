-- Migration: 057_iccr_application_number
-- Description: Adds canonical iccr_application_number column to public.student_academic,
--              backfills from existing legacy records, creates index, and documents column metadata.
-- Dependencies: 053_student_registration_expansion.sql, 056_canonical_schools_and_departments.sql
-- Transaction: Yes

BEGIN;

-- 1. Add iccr_application_number column to student_academic
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS iccr_application_number VARCHAR(100) DEFAULT NULL;

-- 2. Backfill existing ICCR students where sii_application_number was previously stored
UPDATE public.student_academic
SET iccr_application_number = sii_application_number
WHERE admission_category = 'iccr'
  AND sii_application_number IS NOT NULL
  AND (iccr_application_number IS NULL OR iccr_application_number = '');

-- 3. Create performance index for fast operational search and lookup
CREATE INDEX IF NOT EXISTS idx_student_academic_iccr_app_no 
    ON public.student_academic (iccr_application_number) 
    WHERE iccr_application_number IS NOT NULL;

-- 4. Document column
COMMENT ON COLUMN public.student_academic.iccr_application_number IS 
    'Indian Council for Cultural Relations (ICCR) application identifier. Mandatory when admission_category is iccr.';

COMMIT;

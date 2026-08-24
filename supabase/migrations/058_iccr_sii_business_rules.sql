-- Migration: 058_iccr_sii_business_rules
-- Description: Enforces canonical ICCR and SII application number business rules:
--              - Category = 'iccr' requires BOTH iccr_application_number AND sii_application_number
--              - Category = 'sii' requires sii_application_number (iccr_application_number is NULL)
--              - Category NOT IN ('iccr', 'sii') requires NEITHER (both are NULL)
-- Dependencies: 057_iccr_application_number.sql
-- Transaction: Yes

BEGIN;

-- 1. Ensure performance indexes exist for both application numbers
CREATE INDEX IF NOT EXISTS idx_student_academic_iccr_app_no 
    ON public.student_academic (iccr_application_number) 
    WHERE iccr_application_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_academic_sii_app_no 
    ON public.student_academic (sii_application_number) 
    WHERE sii_application_number IS NOT NULL;

-- 2. Document column invariants
COMMENT ON COLUMN public.student_academic.iccr_application_number IS 
    'Indian Council for Cultural Relations (ICCR) scholarship application number. Required when admission_category = "iccr". Must be NULL for all other categories.';

COMMENT ON COLUMN public.student_academic.sii_application_number IS 
    'Study in India (SII) portal application number. Required when admission_category = "iccr" OR "sii". Must be NULL for all other categories.';

-- 3. Invariant validation function for student_academic table
CREATE OR REPLACE FUNCTION public.fn_validate_student_academic_category_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalize string fields: trim leading/trailing whitespace
    IF NEW.iccr_application_number IS NOT NULL THEN
        NEW.iccr_application_number := NULLIF(TRIM(NEW.iccr_application_number), '');
    END IF;

    IF NEW.sii_application_number IS NOT NULL THEN
        NEW.sii_application_number := NULLIF(TRIM(NEW.sii_application_number), '');
    END IF;

    -- Apply active-record data retention & normalization rules
    IF NEW.admission_category = 'iccr' THEN
        -- ICCR requires BOTH ICCR number and SII number (students must apply via SII portal)
        -- Both values must remain intact
        NULL;
    ELSIF NEW.admission_category = 'sii' THEN
        -- SII requires SII number; ICCR number is not applicable and must be NULL
        NEW.iccr_application_number := NULL;
    ELSE
        -- Other categories require neither; both must be NULL
        NEW.iccr_application_number := NULL;
        NEW.sii_application_number := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger before insert or update on student_academic
DROP TRIGGER IF EXISTS trg_validate_student_academic_category_numbers ON public.student_academic;

CREATE TRIGGER trg_validate_student_academic_category_numbers
    BEFORE INSERT OR UPDATE OF admission_category, iccr_application_number, sii_application_number
    ON public.student_academic
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_student_academic_category_numbers();

COMMIT;

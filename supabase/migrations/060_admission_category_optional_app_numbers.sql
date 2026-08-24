-- Migration: 060_admission_category_optional_app_numbers
-- Description: Standardizes ICCR and SII application numbers as independent optional fields for all admission categories.
--              - ICCR Application Number: Always optional across all categories
--              - SII Application Number: Always optional across all categories
--              - Admission Category does not determine visibility, requirement, or clearing of either field.
-- Dependencies: 058_iccr_sii_business_rules.sql
-- Transaction: Yes

BEGIN;

-- 1. Update column comments to reflect optional status across all categories
COMMENT ON COLUMN public.student_academic.iccr_application_number IS 
    'Indian Council for Cultural Relations (ICCR) scholarship application number. Optional for all admission categories.';

COMMENT ON COLUMN public.student_academic.sii_application_number IS 
    'Study in India (SII) portal application number. Optional for all admission categories.';

-- 2. Update trigger function: normalize whitespace to NULL but DO NOT clear application numbers based on admission_category
CREATE OR REPLACE FUNCTION public.fn_validate_student_academic_category_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalize string fields: trim leading/trailing whitespace and map empty string to NULL
    IF NEW.iccr_application_number IS NOT NULL THEN
        NEW.iccr_application_number := NULLIF(TRIM(NEW.iccr_application_number), '');
    END IF;

    IF NEW.sii_application_number IS NOT NULL THEN
        NEW.sii_application_number := NULLIF(TRIM(NEW.sii_application_number), '');
    END IF;

    -- Application numbers are independent optional fields across all admission categories.
    -- Preserves values across any category change.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure trigger is attached
DROP TRIGGER IF EXISTS trg_validate_student_academic_category_numbers ON public.student_academic;

CREATE TRIGGER trg_validate_student_academic_category_numbers
    BEFORE INSERT OR UPDATE OF admission_category, iccr_application_number, sii_application_number
    ON public.student_academic
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_student_academic_category_numbers();

COMMIT;

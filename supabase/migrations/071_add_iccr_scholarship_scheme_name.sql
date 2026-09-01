-- Migration: 071_add_iccr_scholarship_scheme_name.sql
-- Description: Adds optional Name of ICCR Scholarship Scheme (iccr_scholarship_scheme_name)
--              to public.student_academic for ISCMS.
--              The field is strictly optional and nullable across all admission categories.
-- Dependencies: 004_student_details.sql, 057_iccr_application_number.sql, 060_admission_category_optional_app_numbers.sql
-- Transaction: Yes

BEGIN;

-- 1. Student Academic: Add optional iccr_scholarship_scheme_name column
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS iccr_scholarship_scheme_name VARCHAR(255) DEFAULT NULL;

-- 2. Update trigger function to normalize whitespace for iccr_scholarship_scheme_name
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

    IF NEW.iccr_scholarship_scheme_name IS NOT NULL THEN
        NEW.iccr_scholarship_scheme_name := NULLIF(TRIM(NEW.iccr_scholarship_scheme_name), '');
    END IF;

    -- Application numbers and scholarship scheme names are independent optional fields across all admission categories.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure trigger is attached
DROP TRIGGER IF EXISTS trg_validate_student_academic_category_numbers ON public.student_academic;

CREATE TRIGGER trg_validate_student_academic_category_numbers
    BEFORE INSERT OR UPDATE OF admission_category, iccr_application_number, sii_application_number, iccr_scholarship_scheme_name
    ON public.student_academic
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_student_academic_category_numbers();

-- 4. Documentation Comments
COMMENT ON COLUMN public.student_academic.iccr_scholarship_scheme_name IS 
    'Name of the ICCR scholarship scheme under which the student is studying (e.g. Silver Jubilee Scholarship Scheme, Africa Scholarship Scheme). Strictly optional and nullable across all categories.';

COMMIT;

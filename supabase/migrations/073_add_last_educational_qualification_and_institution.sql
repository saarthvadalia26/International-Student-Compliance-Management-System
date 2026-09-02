-- Migration: 073_add_last_educational_qualification_and_institution.sql
-- Description: Adds optional Last Educational Qualification and Name of University/Institute/School
--              to public.student_academic for recording prior educational background in ISCMS.
--              Both fields are completely optional and nullable across all academic tracks.
-- Dependencies: 004_student_details.sql, 071_add_iccr_scholarship_scheme_name.sql, 072_profile_bank_scholarship_campus_expansion.sql
-- Transaction: Yes

BEGIN;

-- 1. Student Academic: Add optional educational background columns
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS last_educational_qualification VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_educational_institution VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN public.student_academic.last_educational_qualification IS 
    'Student prior or latest educational qualification earned prior to university enrollment (e.g. Bachelor of Science). Strictly optional and nullable.';

COMMENT ON COLUMN public.student_academic.last_educational_institution IS 
    'Name of the university, institute, or school where the student earned their last qualification. Strictly optional and nullable.';

-- 2. Update trigger function to trim whitespace and normalize empty strings to NULL
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

    IF NEW.last_educational_qualification IS NOT NULL THEN
        NEW.last_educational_qualification := NULLIF(TRIM(NEW.last_educational_qualification), '');
    END IF;

    IF NEW.last_educational_institution IS NOT NULL THEN
        NEW.last_educational_institution := NULLIF(TRIM(NEW.last_educational_institution), '');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-attach trigger
DROP TRIGGER IF EXISTS trg_validate_student_academic_category_numbers ON public.student_academic;

CREATE TRIGGER trg_validate_student_academic_category_numbers
    BEFORE INSERT OR UPDATE OF 
        admission_category, 
        iccr_application_number, 
        sii_application_number, 
        iccr_scholarship_scheme_name,
        last_educational_qualification,
        last_educational_institution
    ON public.student_academic
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_validate_student_academic_category_numbers();

COMMIT;

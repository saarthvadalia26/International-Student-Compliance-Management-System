-- Migration: 044_allow_nullable_optional_student_fields.sql
-- Description: Makes optional student personal, contact, academic, and relationship fields nullable.
--              Enforces that ISCMS never requires optional data to be fabricated or blocked during Excel bulk import.
-- Transaction: Yes

BEGIN;

-- 1. Student Personal Table: Make nationality_code and date_of_birth nullable
ALTER TABLE public.student_personal ALTER COLUMN nationality_code DROP NOT NULL;
ALTER TABLE public.student_personal ALTER COLUMN date_of_birth DROP NOT NULL;

-- Update check constraint for date_of_birth to allow NULL
ALTER TABLE public.student_personal DROP CONSTRAINT IF EXISTS chk_personal_dob;
ALTER TABLE public.student_personal ADD CONSTRAINT chk_personal_dob 
    CHECK (date_of_birth IS NULL OR date_of_birth < CURRENT_DATE);

-- 2. Student Contact Table: Make email, phone_home, permanent_address nullable
ALTER TABLE public.student_contact ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.student_contact ALTER COLUMN phone_home DROP NOT NULL;
ALTER TABLE public.student_contact ALTER COLUMN permanent_address DROP NOT NULL;

-- Update check constraints for contact fields to allow NULL
ALTER TABLE public.student_contact DROP CONSTRAINT IF EXISTS chk_contact_email_regex;
ALTER TABLE public.student_contact ADD CONSTRAINT chk_contact_email_regex 
    CHECK (email IS NULL OR email ~* '^.+@.+\..+$');

ALTER TABLE public.student_contact DROP CONSTRAINT IF EXISTS chk_contact_phone_home_not_empty;
ALTER TABLE public.student_contact ADD CONSTRAINT chk_contact_phone_home_not_empty 
    CHECK (phone_home IS NULL OR length(trim(phone_home)) > 0);

ALTER TABLE public.student_contact DROP CONSTRAINT IF EXISTS chk_contact_perm_address_not_empty;
ALTER TABLE public.student_contact ADD CONSTRAINT chk_contact_perm_address_not_empty 
    CHECK (permanent_address IS NULL OR length(trim(permanent_address)) > 0);

-- 3. Student Academic Table: Make admission_date, expected_graduation, current_semester nullable
ALTER TABLE public.student_academic ALTER COLUMN admission_date DROP NOT NULL;
ALTER TABLE public.student_academic ALTER COLUMN expected_graduation DROP NOT NULL;
ALTER TABLE public.student_academic ALTER COLUMN current_semester DROP NOT NULL;
ALTER TABLE public.student_academic ALTER COLUMN current_semester DROP DEFAULT;

-- Update check constraints for academic fields to allow NULL
ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS chk_academic_semester;
ALTER TABLE public.student_academic ADD CONSTRAINT chk_academic_semester 
    CHECK (current_semester IS NULL OR (current_semester > 0 AND current_semester < 20));

ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS chk_academic_graduation_after_admission;
ALTER TABLE public.student_academic ADD CONSTRAINT chk_academic_graduation_after_admission 
    CHECK (admission_date IS NULL OR expected_graduation IS NULL OR expected_graduation > admission_date);

-- 4. Document architectural intent
COMMENT ON TABLE public.student_personal IS 'Personal identity metadata. Optional fields like date of birth and nationality are nullable to support real-world bulk import.';
COMMENT ON TABLE public.student_contact IS 'Contact coordinates. Optional fields are nullable when unavailable during initial enrollment import.';
COMMENT ON TABLE public.student_academic IS 'Academic enrollment tracks. Progression details are calculated when valid start dates are available or completed later.';

COMMIT;

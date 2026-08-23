-- Migration: 053_student_registration_expansion.sql
-- Description: Expands ISCMS student registration schema with demographic, family,
--              expanded relationship types, and admission category fields.
-- Dependencies: 004_student_details.sql, 044_allow_nullable_optional_student_fields.sql, 049_v020_phone_numbers_and_reminder_boundary.sql
-- Transaction: Yes

BEGIN;

-- 1. Student Personal Table: Demographic & Family Information
ALTER TABLE public.student_personal
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS physical_disability BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_mobile VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_mobile_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_mobile_number VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_whatsapp VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_whatsapp_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS father_whatsapp_number VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_mobile VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_mobile_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_mobile_number VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_whatsapp VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_whatsapp_country_code VARCHAR(10) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_whatsapp_number VARCHAR(50) DEFAULT NULL;

-- Alter blood_group column size if necessary to ensure it accommodates 'AB+' / 'AB-'
ALTER TABLE public.student_personal ALTER COLUMN blood_group TYPE VARCHAR(10);

-- Constraints on student_personal
ALTER TABLE public.student_personal DROP CONSTRAINT IF EXISTS chk_personal_marital_status;
ALTER TABLE public.student_personal ADD CONSTRAINT chk_personal_marital_status 
    CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated', 'other', 'prefer_not_to_say'));

ALTER TABLE public.student_personal DROP CONSTRAINT IF EXISTS chk_personal_blood_group;
ALTER TABLE public.student_personal ADD CONSTRAINT chk_personal_blood_group 
    CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- 2. Student Relationships: Expand relationship types to include Spouse, Husband, Wife, Siblings, etc.
ALTER TABLE public.student_relationships DROP CONSTRAINT IF EXISTS chk_relationships_type;
ALTER TABLE public.student_relationships ADD CONSTRAINT chk_relationships_type 
    CHECK (relationship_type IN ('father', 'mother', 'brother', 'sister', 'guardian', 'husband', 'wife', 'spouse', 'parent', 'local_sponsor', 'other'));

-- 3. Student Academic Table: Admission Categories & SII Application Number
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS admission_category VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS admission_category_other VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sii_application_number VARCHAR(100) DEFAULT NULL;

ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS chk_academic_admission_category;
ALTER TABLE public.student_academic ADD CONSTRAINT chk_academic_admission_category 
    CHECK (admission_category IS NULL OR admission_category IN ('iccr', 'sii', 'direct', 'foreign_govt_sponsored', 'other'));

-- 4. Documentation Comments
COMMENT ON COLUMN public.student_personal.marital_status IS 'Marital status enumeration (single, married, divorced, widowed, separated, other, prefer_not_to_say).';
COMMENT ON COLUMN public.student_personal.physical_disability IS 'Explicit 3-state disability flag: NULL (not provided), true (Yes), false (No).';
COMMENT ON COLUMN public.student_personal.father_name IS 'Full legal name of the student father.';
COMMENT ON COLUMN public.student_personal.father_mobile IS 'Full international mobile number for student father.';
COMMENT ON COLUMN public.student_personal.father_whatsapp IS 'Full international WhatsApp number for student father.';
COMMENT ON COLUMN public.student_personal.mother_name IS 'Full legal name of the student mother.';
COMMENT ON COLUMN public.student_personal.mother_mobile IS 'Full international mobile number for student mother.';
COMMENT ON COLUMN public.student_personal.mother_whatsapp IS 'Full international WhatsApp number for student mother.';
COMMENT ON COLUMN public.student_academic.admission_category IS 'Institutional admission channel (iccr, sii, direct, foreign_govt_sponsored, other).';
COMMENT ON COLUMN public.student_academic.admission_category_other IS 'Custom admission specification when admission_category is other.';
COMMENT ON COLUMN public.student_academic.sii_application_number IS 'Study in India (SII) application identifier. Mandatory when admission_category is iccr.';

COMMIT;

-- Migration: 069_add_father_mother_email.sql
-- Description: Adds optional Father and Mother Email ID fields to student_personal for ISCMS v0.3.0
-- Dependencies: 004_student_details.sql, 053_student_registration_expansion.sql
-- Transaction: Yes

BEGIN;

-- 1. Student Personal: Add optional father_email and mother_email columns
ALTER TABLE public.student_personal
    ADD COLUMN IF NOT EXISTS father_email VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255) DEFAULT NULL;

-- 2. Documentation Comments
COMMENT ON COLUMN public.student_personal.father_email IS 'Optional standard email address for the student father.';
COMMENT ON COLUMN public.student_personal.mother_email IS 'Optional standard email address for the student mother.';

COMMIT;

-- Migration: 070_add_present_address.sql
-- Description: Adds optional Present / Current Address (present_address) to student_contact for ISCMS v0.3.0
-- Dependencies: 004_student_details.sql, 044_allow_nullable_optional_student_fields.sql
-- Transaction: Yes

BEGIN;

-- 1. Student Contact: Add optional present_address column
ALTER TABLE public.student_contact
    ADD COLUMN IF NOT EXISTS present_address TEXT DEFAULT NULL;

-- 2. Documentation Comments
COMMENT ON COLUMN public.student_contact.present_address IS 'Optional present / current residential address in India (hostel, campus residence, or local apartment). Separate from permanent home country address.';

COMMIT;

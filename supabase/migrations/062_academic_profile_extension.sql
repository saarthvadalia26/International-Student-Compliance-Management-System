-- Migration: 062_academic_profile_extension
-- Description: Extends public.student_academic with admission/academic year,
--              fee payment category (funding type), tuition fees, and hostel fees.
--              All columns are strictly nullable with no NOT NULL constraints and
--              no implicit defaults that would misrepresent unspecified data.
-- Dependencies: 004_student_details.sql, 061_add_nfsu_campus_to_student_academic.sql
-- Transaction: Yes

BEGIN;

-- 1. Add admission_academic_year
--    Records the academic-year label in which the student was admitted/enrolled.
--    Free-text to support formats like "2024-25", "2025-26", "2026-27".
--    Deliberately separate from admission_date (which is a precise calendar date).
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS admission_academic_year VARCHAR(20) DEFAULT NULL;

-- 2. Add fee_payment_category (funding type)
--    Specifies how the student's fees are funded.
--    NULL = not specified (distinct from any funded state).
--    Allowed values: 'self_financed', 'scholarship'
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS fee_payment_category VARCHAR(30) DEFAULT NULL;

ALTER TABLE public.student_academic
    DROP CONSTRAINT IF EXISTS chk_academic_fee_payment_category;
ALTER TABLE public.student_academic
    ADD CONSTRAINT chk_academic_fee_payment_category
    CHECK (fee_payment_category IS NULL OR fee_payment_category IN ('self_financed', 'scholarship'));

-- 3. Add tuition_fee_amount
--    Stores the numeric tuition fee amount.
--    NUMERIC(15,2) is used for monetary values to avoid floating-point imprecision.
--    NULL means the amount has not been entered (not zero).
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS tuition_fee_amount NUMERIC(15,2) DEFAULT NULL;

-- 4. Add tuition_fee_currency
--    Stores the ISO 4217 currency code for the tuition fee.
--    NULL means currency is unspecified (not defaulted to any currency when amount is NULL).
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS tuition_fee_currency VARCHAR(3) DEFAULT NULL;

ALTER TABLE public.student_academic
    DROP CONSTRAINT IF EXISTS chk_academic_tuition_fee_currency;
ALTER TABLE public.student_academic
    ADD CONSTRAINT chk_academic_tuition_fee_currency
    CHECK (tuition_fee_currency IS NULL OR tuition_fee_currency IN ('INR', 'USD'));

-- 5. Add hostel_fee_amount
--    Stores the numeric hostel fee amount.
--    NUMERIC(15,2) for monetary precision. NULL ≠ 0.
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS hostel_fee_amount NUMERIC(15,2) DEFAULT NULL;

-- 6. Add hostel_fee_currency
--    Stores the ISO 4217 currency code for the hostel fee.
--    NULL means currency is unspecified independently of amount.
ALTER TABLE public.student_academic
    ADD COLUMN IF NOT EXISTS hostel_fee_currency VARCHAR(3) DEFAULT NULL;

ALTER TABLE public.student_academic
    DROP CONSTRAINT IF EXISTS chk_academic_hostel_fee_currency;
ALTER TABLE public.student_academic
    ADD CONSTRAINT chk_academic_hostel_fee_currency
    CHECK (hostel_fee_currency IS NULL OR hostel_fee_currency IN ('INR', 'USD'));

-- 7. Performance index for fee_payment_category (supports filtering)
CREATE INDEX IF NOT EXISTS idx_student_academic_fee_payment_category
    ON public.student_academic (fee_payment_category)
    WHERE fee_payment_category IS NOT NULL AND deleted_at IS NULL;

-- 8. Column documentation
COMMENT ON COLUMN public.student_academic.admission_academic_year IS
    'Academic year label in which the student was admitted/enrolled (e.g., "2024-25", "2025-26"). '
    'Free-text field distinct from admission_date. Optional; NULL = not specified.';

COMMENT ON COLUMN public.student_academic.fee_payment_category IS
    'Fee funding classification: self_financed or scholarship. '
    'NULL = not specified (not equivalent to self_financed). '
    'Allowed values: self_financed, scholarship.';

COMMENT ON COLUMN public.student_academic.tuition_fee_amount IS
    'Tuition fee amount stored as NUMERIC(15,2) for monetary precision. '
    'NULL means the amount has not been entered. NULL is strictly NOT the same as 0.';

COMMENT ON COLUMN public.student_academic.tuition_fee_currency IS
    'ISO 4217 currency code for tuition_fee_amount. Allowed values: INR, USD. '
    'NULL means unspecified; not automatically defaulted when amount is NULL.';

COMMENT ON COLUMN public.student_academic.hostel_fee_amount IS
    'Hostel fee amount stored as NUMERIC(15,2) for monetary precision. '
    'NULL means the amount has not been entered. NULL is strictly NOT the same as 0.';

COMMENT ON COLUMN public.student_academic.hostel_fee_currency IS
    'ISO 4217 currency code for hostel_fee_amount. Allowed values: INR, USD. '
    'NULL means unspecified; not automatically defaulted when amount is NULL.';

COMMIT;

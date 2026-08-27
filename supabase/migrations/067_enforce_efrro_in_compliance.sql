-- Migration: 067_enforce_efrro_in_compliance
-- Description: Recomputes document statuses and overall compliance_status in public.student_snapshot
--              enforcing that Passport, Visa, and eFRRO are all mandatory for international student compliance.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Recompute passport_status based on passport_number and passport_expiry
UPDATE public.student_snapshot
SET passport_status = CASE
    WHEN passport_number IS NULL OR trim(passport_number) = '' OR passport_expiry IS NULL THEN 'MISSING'
    WHEN passport_expiry < CURRENT_DATE THEN 'EXPIRED'
    WHEN passport_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
    ELSE 'COMPLIANT'
END;

-- 2. Recompute visa_status based on visa_number and visa_expiry
UPDATE public.student_snapshot
SET visa_status = CASE
    WHEN visa_number IS NULL OR trim(visa_number) = '' OR visa_expiry IS NULL THEN 'MISSING'
    WHEN visa_expiry < CURRENT_DATE THEN 'EXPIRED'
    WHEN visa_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
    ELSE 'COMPLIANT'
END;

-- 3. Recompute efrro_status and days_until_efrro_expiry
UPDATE public.student_snapshot
SET 
    efrro_status = CASE
        WHEN efrro_number IS NULL OR trim(efrro_number) = '' OR efrro_expiry IS NULL THEN 'MISSING'
        WHEN efrro_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN efrro_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
        ELSE 'COMPLIANT'
    END,
    days_until_efrro_expiry = CASE
        WHEN efrro_expiry IS NOT NULL THEN (efrro_expiry - CURRENT_DATE)
        ELSE NULL
    END;

-- 4. Recompute overall compliance_status and compliance_score
-- Rules:
-- - Passport, Visa, and eFRRO are mandatory for international students studying in India under ISCMS.
-- - EXPIRED: any required document (Passport, Visa, or eFRRO) is expired.
-- - REJECTED: any required document is rejected.
-- - MISSING: any required document (Passport, Visa, or eFRRO) is missing.
-- - WARNING: any required document is expiring within 30 days.
-- - COMPLIANT: all 3 required documents are present, valid, and have > 30 days remaining.
UPDATE public.student_snapshot
SET 
    compliance_status = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' OR efrro_status = 'EXPIRED' THEN 'EXPIRED'
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' OR efrro_status = 'REJECTED' THEN 'REJECTED'
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' OR efrro_status = 'MISSING' THEN 'MISSING'
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' OR efrro_status = 'WARNING' THEN 'WARNING'
        WHEN passport_status = 'PENDING_VERIFICATION' OR visa_status = 'PENDING_VERIFICATION' OR efrro_status = 'PENDING_VERIFICATION' THEN 'PENDING_VERIFICATION'
        ELSE 'COMPLIANT'
    END,
    compliance_score = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' OR efrro_status = 'EXPIRED' THEN 10
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' OR efrro_status = 'REJECTED' THEN 10
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' OR efrro_status = 'MISSING' THEN 0
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' OR efrro_status = 'WARNING' THEN 70
        WHEN passport_status = 'PENDING_VERIFICATION' OR visa_status = 'PENDING_VERIFICATION' OR efrro_status = 'PENDING_VERIFICATION' THEN 50
        ELSE 100
    END,
    updated_at = now();

COMMIT;

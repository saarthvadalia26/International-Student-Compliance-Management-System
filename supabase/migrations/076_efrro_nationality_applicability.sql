-- Migration: 076_efrro_nationality_applicability
-- Description: Updates public.student_snapshot check constraints to allow 'NOT_APPLICABLE'
--              for eFRRO status and updates existing Indian students accordingly.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Drop existing efrro_status check constraint and add updated constraint including 'NOT_APPLICABLE'
ALTER TABLE public.student_snapshot
    DROP CONSTRAINT IF EXISTS chk_snapshot_efrro_status;

ALTER TABLE public.student_snapshot
    ADD CONSTRAINT chk_snapshot_efrro_status 
        CHECK (efrro_status IN (
            'COMPLIANT', 
            'WARNING', 
            'EXPIRED', 
            'PENDING_VERIFICATION', 
            'VERIFIED', 
            'REJECTED', 
            'MISSING', 
            'NOT_UPLOADED', 
            'NOT_APPLICABLE'
        ));

-- 2. Update all existing Indian students in student_snapshot to efrro_status = 'NOT_APPLICABLE'
UPDATE public.student_snapshot ss
SET 
    efrro_status = 'NOT_APPLICABLE',
    days_until_efrro_expiry = NULL,
    updated_at = now()
FROM public.student_personal sp
WHERE ss.student_id = sp.student_id
  AND (
    upper(trim(coalesce(sp.nationality_code, ''))) IN ('IND', 'IN', '356', 'INDIA', 'INDIAN')
  );

-- 3. Recompute overall compliance_status for Indian students based strictly on Passport and Visa
UPDATE public.student_snapshot ss
SET 
    compliance_status = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' THEN 'EXPIRED'
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' THEN 'REJECTED'
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' THEN 'MISSING'
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' THEN 'WARNING'
        WHEN passport_status = 'PENDING_VERIFICATION' OR visa_status = 'PENDING_VERIFICATION' THEN 'PENDING_VERIFICATION'
        ELSE 'COMPLIANT'
    END,
    compliance_score = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' THEN 10
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' THEN 10
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' THEN 0
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' THEN 70
        WHEN passport_status = 'PENDING_VERIFICATION' OR visa_status = 'PENDING_VERIFICATION' THEN 50
        ELSE 100
    END,
    updated_at = now()
FROM public.student_personal sp
WHERE ss.student_id = sp.student_id
  AND (
    upper(trim(coalesce(sp.nationality_code, ''))) IN ('IND', 'IN', '356', 'INDIA', 'INDIAN')
  );

COMMIT;

-- Migration: 077_ciwgc_visa_applicability
-- Description: Updates public.student_snapshot check constraints to allow 'NOT_APPLICABLE'
--              for visa_status and updates existing Indian CIWGC students accordingly.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Drop existing visa_status check constraint and add updated constraint including 'NOT_APPLICABLE'
ALTER TABLE public.student_snapshot
    DROP CONSTRAINT IF EXISTS chk_snapshot_visa_status;

ALTER TABLE public.student_snapshot
    ADD CONSTRAINT chk_snapshot_visa_status 
        CHECK (visa_status IN (
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

-- 2. Update all existing Indian CIWGC students in student_snapshot to visa_status = 'NOT_APPLICABLE'
UPDATE public.student_snapshot ss
SET 
    visa_status = 'NOT_APPLICABLE',
    updated_at = now()
FROM public.student_personal sp
JOIN public.student_academic sa ON sp.student_id = sa.student_id
WHERE ss.student_id = sp.student_id
  AND (
    upper(trim(coalesce(sp.nationality_code, ''))) IN ('IND', 'IN', '356', 'INDIA', 'INDIAN')
  )
  AND lower(trim(coalesce(sa.admission_category, ''))) = 'other'
  AND upper(trim(coalesce(sa.admission_category_other, ''))) LIKE 'CIWGC%';

-- 3. Recompute overall compliance_status for Indian CIWGC students based strictly on Passport
UPDATE public.student_snapshot ss
SET 
    compliance_status = CASE
        WHEN passport_status = 'EXPIRED' THEN 'EXPIRED'
        WHEN passport_status = 'REJECTED' THEN 'REJECTED'
        WHEN passport_status = 'MISSING' THEN 'MISSING'
        WHEN passport_status = 'WARNING' THEN 'WARNING'
        WHEN passport_status = 'PENDING_VERIFICATION' THEN 'PENDING_VERIFICATION'
        ELSE 'COMPLIANT'
    END,
    compliance_score = CASE
        WHEN passport_status = 'EXPIRED' THEN 10
        WHEN passport_status = 'REJECTED' THEN 10
        WHEN passport_status = 'MISSING' THEN 0
        WHEN passport_status = 'WARNING' THEN 70
        WHEN passport_status = 'PENDING_VERIFICATION' THEN 50
        ELSE 100
    END,
    updated_at = now()
FROM public.student_personal sp
JOIN public.student_academic sa ON sp.student_id = sa.student_id
WHERE ss.student_id = sp.student_id
  AND (
    upper(trim(coalesce(sp.nationality_code, ''))) IN ('IND', 'IN', '356', 'INDIA', 'INDIAN')
  )
  AND lower(trim(coalesce(sa.admission_category, ''))) = 'other'
  AND upper(trim(coalesce(sa.admission_category_other, ''))) LIKE 'CIWGC%';

COMMIT;

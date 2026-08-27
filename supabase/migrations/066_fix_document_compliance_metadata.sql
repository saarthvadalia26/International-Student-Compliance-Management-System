-- Migration: 066_fix_document_compliance_metadata
-- Description: Recomputes document statuses, days_until_efrro_expiry, compliance_score, and overall compliance_status
--              across public.student_snapshot based on authoritative document metadata and expiration dates.
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
-- - Passport and Visa are mandatory for international student compliance.
-- - eFRRO is conditional: evaluated if efrro_number is present; if absent, it does not mark the student MISSING.
-- - EXPIRED: any active document is expired.
-- - MISSING: mandatory passport or visa is missing.
-- - WARNING: any active document is expiring within 30 days.
-- - COMPLIANT: mandatory documents and optional eFRRO (if present) are valid with > 30 days remaining.
UPDATE public.student_snapshot
SET 
    compliance_status = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'EXPIRED') THEN 'EXPIRED'
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'REJECTED') THEN 'REJECTED'
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' THEN 'MISSING'
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'WARNING') THEN 'WARNING'
        ELSE 'COMPLIANT'
    END,
    compliance_score = CASE
        WHEN passport_status = 'EXPIRED' OR visa_status = 'EXPIRED' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'EXPIRED') THEN 10
        WHEN passport_status = 'REJECTED' OR visa_status = 'REJECTED' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'REJECTED') THEN 10
        WHEN passport_status = 'MISSING' OR visa_status = 'MISSING' THEN 0
        WHEN passport_status = 'WARNING' OR visa_status = 'WARNING' 
             OR (efrro_number IS NOT NULL AND trim(efrro_number) <> '' AND efrro_status = 'WARNING') THEN 70
        ELSE 100
    END,
    updated_at = now();

COMMIT;

-- Migration: 031_fix_document_verification_state
-- Description: Decouples student metadata initialization from document verification state.
-- Removes legacy placeholder records and ensures only actual uploaded files enter PENDING_VERIFICATION.
-- Transaction: Yes.

BEGIN;

-- 1. Remove legacy placeholder records where no physical file was uploaded
DELETE FROM public.passport_versions
WHERE file_path = 'pending_upload' OR file_path IS NULL OR trim(file_path) = '';

DELETE FROM public.visa_versions
WHERE file_path = 'pending_upload' OR file_path IS NULL OR trim(file_path) = '';

DELETE FROM public.efrro_versions
WHERE file_path = 'pending_upload' OR file_path IS NULL OR trim(file_path) = '';

-- 2. Update snapshot table constraints to allow NOT_UPLOADED as standard enum value
ALTER TABLE public.student_snapshot
    DROP CONSTRAINT IF EXISTS chk_snapshot_passport_status,
    DROP CONSTRAINT IF EXISTS chk_snapshot_visa_status,
    DROP CONSTRAINT IF EXISTS chk_snapshot_efrro_status,
    DROP CONSTRAINT IF EXISTS chk_snapshot_compliance_status;

ALTER TABLE public.student_snapshot
    ADD CONSTRAINT chk_snapshot_passport_status 
        CHECK (passport_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'MISSING', 'NOT_UPLOADED')),
    ADD CONSTRAINT chk_snapshot_visa_status 
        CHECK (visa_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'MISSING', 'NOT_UPLOADED')),
    ADD CONSTRAINT chk_snapshot_efrro_status 
        CHECK (efrro_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'MISSING', 'NOT_UPLOADED')),
    ADD CONSTRAINT chk_snapshot_compliance_status 
        CHECK (compliance_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'MISSING', 'NOT_UPLOADED'));

-- 3. Correct student_snapshot records where no active uploaded file exists
UPDATE public.student_snapshot ss
SET 
    passport_status = 'MISSING',
    updated_at = now()
WHERE ss.passport_status = 'PENDING_VERIFICATION'
  AND NOT EXISTS (
      SELECT 1 FROM public.passport_versions pv
      WHERE pv.student_id = ss.student_id
        AND pv.is_active = TRUE
        AND pv.deleted_at IS NULL
        AND pv.file_path IS NOT NULL
        AND pv.file_path <> 'pending_upload'
  );

UPDATE public.student_snapshot ss
SET 
    visa_status = 'MISSING',
    updated_at = now()
WHERE ss.visa_status = 'PENDING_VERIFICATION'
  AND NOT EXISTS (
      SELECT 1 FROM public.visa_versions vv
      WHERE vv.student_id = ss.student_id
        AND vv.is_active = TRUE
        AND vv.deleted_at IS NULL
        AND vv.file_path IS NOT NULL
        AND vv.file_path <> 'pending_upload'
  );

UPDATE public.student_snapshot ss
SET 
    efrro_status = 'MISSING',
    updated_at = now()
WHERE ss.efrro_status = 'PENDING_VERIFICATION'
  AND NOT EXISTS (
      SELECT 1 FROM public.efrro_versions ev
      WHERE ev.student_id = ss.student_id
        AND ev.is_active = TRUE
        AND ev.deleted_at IS NULL
        AND ev.file_path IS NOT NULL
        AND ev.file_path <> 'pending_upload'
  );

-- Recompute overall compliance_status for affected students
UPDATE public.student_snapshot
SET 
    compliance_status = 'MISSING',
    compliance_score = 0,
    updated_at = now()
WHERE compliance_status = 'PENDING_VERIFICATION'
  AND passport_status = 'MISSING'
  AND visa_status = 'MISSING'
  AND efrro_status = 'MISSING';

COMMIT;

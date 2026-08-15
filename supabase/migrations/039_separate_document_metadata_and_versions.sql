-- Migration: 039_separate_document_metadata_and_versions
-- Description: Enforces separation between document compliance metadata and physical document versions.
-- Ensures that passport_versions, visa_versions, and efrro_versions only contain real uploaded files,
-- while student_snapshot serves as the authoritative metadata store.
-- Transaction: Yes.

BEGIN;

-- 1. Database Comments formally defining the separation of concerns
COMMENT ON TABLE public.student_snapshot IS 'Authoritative compliance metadata and calculation cache. Stores passport, visa, and eFRRO numbers, issue dates, and expiry dates regardless of whether a physical document copy has been uploaded.';
COMMENT ON TABLE public.passport_versions IS 'Immutable audit history of genuine physical passport document uploads. Each row represents a verified or pending physical file stored in Cloudflare R2 / storage provider.';
COMMENT ON TABLE public.visa_versions IS 'Immutable audit history of genuine physical visa document uploads. Each row represents a verified or pending physical file stored in Cloudflare R2 / storage provider.';
COMMENT ON TABLE public.efrro_versions IS 'Immutable audit history of genuine physical eFRRO document uploads. Each row represents a verified or pending physical file stored in Cloudflare R2 / storage provider.';

-- 2. Ensure Strict Check Constraints: Physical file path is mandatory for all version rows
ALTER TABLE public.passport_versions
    DROP CONSTRAINT IF EXISTS chk_passport_file_path_required,
    ADD CONSTRAINT chk_passport_file_path_required
        CHECK (file_path IS NOT NULL AND trim(file_path) <> '' AND file_path <> 'pending_upload' AND file_path <> 'null');

ALTER TABLE public.visa_versions
    DROP CONSTRAINT IF EXISTS chk_visa_file_path_required,
    ADD CONSTRAINT chk_visa_file_path_required
        CHECK (file_path IS NOT NULL AND trim(file_path) <> '' AND file_path <> 'pending_upload' AND file_path <> 'null');

ALTER TABLE public.efrro_versions
    DROP CONSTRAINT IF EXISTS chk_efrro_file_path_required,
    ADD CONSTRAINT chk_efrro_file_path_required
        CHECK (file_path IS NOT NULL AND trim(file_path) <> '' AND file_path <> 'pending_upload' AND file_path <> 'null');

-- 3. Data Integrity & Reconciliation: Clean up any obsolete placeholder records
DELETE FROM public.passport_versions
WHERE file_path = 'pending_upload' 
   OR file_path IS NULL 
   OR trim(file_path) = '' 
   OR file_path = 'null';

DELETE FROM public.visa_versions
WHERE file_path = 'pending_upload' 
   OR file_path IS NULL 
   OR trim(file_path) = '' 
   OR file_path = 'null';

DELETE FROM public.efrro_versions
WHERE file_path = 'pending_upload' 
   OR file_path IS NULL 
   OR trim(file_path) = '' 
   OR file_path = 'null';

-- 4. Re-sequence any remaining physical document versions to strictly start from 1
WITH reordered_passports AS (
    SELECT 
        id, 
        ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at ASC, id ASC) AS correct_version
    FROM public.passport_versions
    WHERE deleted_at IS NULL
)
UPDATE public.passport_versions pv
SET version_number = rp.correct_version,
    updated_at = now()
FROM reordered_passports rp
WHERE pv.id = rp.id
  AND pv.version_number <> rp.correct_version;

WITH reordered_visas AS (
    SELECT 
        id, 
        ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at ASC, id ASC) AS correct_version
    FROM public.visa_versions
    WHERE deleted_at IS NULL
)
UPDATE public.visa_versions vv
SET version_number = rv.correct_version,
    updated_at = now()
FROM reordered_visas rv
WHERE vv.id = rv.id
  AND vv.version_number <> rv.correct_version;

WITH reordered_efrro AS (
    SELECT 
        id, 
        ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at ASC, id ASC) AS correct_version
    FROM public.efrro_versions
    WHERE deleted_at IS NULL
)
UPDATE public.efrro_versions ev
SET version_number = re.correct_version,
    updated_at = now()
FROM reordered_efrro re
WHERE ev.id = re.id
  AND ev.version_number <> re.correct_version;

COMMIT;

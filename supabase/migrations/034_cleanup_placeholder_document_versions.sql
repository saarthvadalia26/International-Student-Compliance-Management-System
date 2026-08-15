-- Migration: 034_cleanup_placeholder_document_versions
-- Description: Cleans up metadata-only placeholder rows from document version tables,
-- re-sequences genuine uploaded versions to start from v1, enforces physical file check constraints,
-- and updates student snapshot status.
-- Transaction: Yes.

BEGIN;

-- 1. Remove all placeholder records where no genuine file was uploaded
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

-- 2. Re-sequence genuine document version numbers starting from 1 per student
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

-- 3. Enforce Database Check Constraints: Physical document file path is strictly mandatory for every version
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

-- 4. Correct student_snapshot records where no genuine uploaded file exists
UPDATE public.student_snapshot ss
SET 
    passport_status = 'MISSING',
    updated_at = now()
WHERE ss.passport_status IN ('PENDING_VERIFICATION', 'VERIFIED')
  AND NOT EXISTS (
      SELECT 1 FROM public.passport_versions pv
      WHERE pv.student_id = ss.student_id
        AND pv.deleted_at IS NULL
        AND pv.file_path IS NOT NULL
        AND pv.file_path <> 'pending_upload'
        AND pv.file_path <> 'null'
        AND trim(pv.file_path) <> ''
  );

UPDATE public.student_snapshot ss
SET 
    visa_status = 'MISSING',
    updated_at = now()
WHERE ss.visa_status IN ('PENDING_VERIFICATION', 'VERIFIED')
  AND NOT EXISTS (
      SELECT 1 FROM public.visa_versions vv
      WHERE vv.student_id = ss.student_id
        AND vv.deleted_at IS NULL
        AND vv.file_path IS NOT NULL
        AND vv.file_path <> 'pending_upload'
        AND vv.file_path <> 'null'
        AND trim(vv.file_path) <> ''
  );

UPDATE public.student_snapshot ss
SET 
    efrro_status = 'MISSING',
    updated_at = now()
WHERE ss.efrro_status IN ('PENDING_VERIFICATION', 'VERIFIED')
  AND NOT EXISTS (
      SELECT 1 FROM public.efrro_versions ev
      WHERE ev.student_id = ss.student_id
        AND ev.deleted_at IS NULL
        AND ev.file_path IS NOT NULL
        AND ev.file_path <> 'pending_upload'
        AND ev.file_path <> 'null'
        AND trim(ev.file_path) <> ''
  );

COMMIT;

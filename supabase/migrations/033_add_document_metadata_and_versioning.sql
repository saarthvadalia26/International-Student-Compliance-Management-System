-- Migration: 033_add_document_metadata_and_versioning
-- Description: Adds place_of_issue to passport_versions, visa_type to visa_versions,
-- and enhances student_snapshot with complete document metadata columns.
-- Transaction: Yes.

BEGIN;

-- 1. Add place_of_issue to passport_versions if not exists
ALTER TABLE public.passport_versions 
    ADD COLUMN IF NOT EXISTS place_of_issue VARCHAR(150) DEFAULT NULL;

-- 2. Add visa_type to visa_versions if not exists
ALTER TABLE public.visa_versions 
    ADD COLUMN IF NOT EXISTS visa_type VARCHAR(100) DEFAULT 'Student (S-1)';

-- 3. Enhance student_snapshot with complete metadata columns
ALTER TABLE public.student_snapshot 
    ADD COLUMN IF NOT EXISTS passport_place_of_issue VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS passport_issue_date DATE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS visa_type VARCHAR(100) DEFAULT 'Student (S-1)',
    ADD COLUMN IF NOT EXISTS visa_issue_date DATE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS efrro_issue_date DATE DEFAULT NULL;

-- 4. Create performance indexes for document version active lookups
CREATE INDEX IF NOT EXISTS idx_passport_versions_active_lookup 
    ON public.passport_versions (student_id, is_active) 
    WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_visa_versions_active_lookup 
    ON public.visa_versions (student_id, is_active) 
    WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_efrro_versions_active_lookup 
    ON public.efrro_versions (student_id, is_active) 
    WHERE (deleted_at IS NULL);

-- 5. Backfill existing active version metadata into student_snapshot if available
UPDATE public.student_snapshot ss
SET 
    passport_place_of_issue = pv.place_of_issue,
    passport_issue_date = pv.issue_date,
    passport_number = COALESCE(pv.document_number, ss.passport_number),
    passport_expiry = COALESCE(pv.expiry_date, ss.passport_expiry)
FROM public.passport_versions pv
WHERE pv.student_id = ss.student_id
  AND pv.is_active = TRUE
  AND pv.deleted_at IS NULL;

UPDATE public.student_snapshot ss
SET 
    visa_type = COALESCE(vv.visa_type, 'Student (S-1)'),
    visa_issue_date = vv.issue_date,
    visa_number = COALESCE(vv.document_number, ss.visa_number),
    visa_expiry = COALESCE(vv.expiry_date, ss.visa_expiry)
FROM public.visa_versions vv
WHERE vv.student_id = ss.student_id
  AND vv.is_active = TRUE
  AND vv.deleted_at IS NULL;

COMMIT;

-- Migration: 016_cloudflare_r2_retention
-- Description: Adds schema configurations for Cloudflare R2 Document Lifecycle retention and auditing.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Add Lifecycle columns to passport_versions
ALTER TABLE public.passport_versions
    ADD COLUMN deletion_reason TEXT DEFAULT NULL,
    ADD COLUMN deleted_by_system BOOLEAN DEFAULT false,
    ADD COLUMN storage_provider VARCHAR(50) DEFAULT 'cloudflare-r2',
    ADD COLUMN storage_object_key TEXT DEFAULT NULL,
    ADD COLUMN storage_status VARCHAR(50) DEFAULT 'ACTIVE';

-- 2. Add Lifecycle columns to visa_versions
ALTER TABLE public.visa_versions
    ADD COLUMN deletion_reason TEXT DEFAULT NULL,
    ADD COLUMN deleted_by_system BOOLEAN DEFAULT false,
    ADD COLUMN storage_provider VARCHAR(50) DEFAULT 'cloudflare-r2',
    ADD COLUMN storage_object_key TEXT DEFAULT NULL,
    ADD COLUMN storage_status VARCHAR(50) DEFAULT 'ACTIVE';

-- 3. Add Lifecycle columns to efrro_versions
ALTER TABLE public.efrro_versions
    ADD COLUMN deletion_reason TEXT DEFAULT NULL,
    ADD COLUMN deleted_by_system BOOLEAN DEFAULT false,
    ADD COLUMN storage_provider VARCHAR(50) DEFAULT 'cloudflare-r2',
    ADD COLUMN storage_object_key TEXT DEFAULT NULL,
    ADD COLUMN storage_status VARCHAR(50) DEFAULT 'ACTIVE';

-- 4. Create Document Lifecycle Audit Log Table
CREATE TABLE IF NOT EXISTS public.document_lifecycle_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_id UUID NOT NULL, -- Logical reference to version ID, no FK constraint as it spans tables
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro')),
    action VARCHAR(50) NOT NULL CHECK (action IN ('Upload', 'Approval', 'Rejection', 'Retention scheduling', 'Deletion', 'Retry attempt', 'Cleanup failure')),
    operator_system VARCHAR(150) NOT NULL,
    correlation_id UUID DEFAULT NULL,
    details JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.document_lifecycle_audit_log IS 'Logs all physical storage lifecycle events (Cloudflare R2)';
COMMENT ON COLUMN public.document_lifecycle_audit_log.action IS 'The specific lifecycle action that occurred';
COMMENT ON COLUMN public.document_lifecycle_audit_log.operator_system IS 'User ID or System process name';
COMMENT ON COLUMN public.document_lifecycle_audit_log.correlation_id IS 'Unique ID tying multiple events to a single scheduled job';

-- 5. Backfill existing storage_object_key using file_path
UPDATE public.passport_versions SET storage_object_key = file_path WHERE storage_object_key IS NULL AND file_path IS NOT NULL;
UPDATE public.visa_versions SET storage_object_key = file_path WHERE storage_object_key IS NULL AND file_path IS NOT NULL;
UPDATE public.efrro_versions SET storage_object_key = file_path WHERE storage_object_key IS NULL AND file_path IS NOT NULL;

COMMIT;

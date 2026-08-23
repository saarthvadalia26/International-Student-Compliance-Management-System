-- Migration: 052_student_portal_performance_indexes
-- Description: Adds targeted indexes for high-frequency student portal queries (profile, documents, replacement requests, notifications).
-- Dependencies: 005_documents.sql, 006_notifications.sql, 037_document_replacement_requests.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Accelerate student reminder history and notification center lookups
CREATE INDEX IF NOT EXISTS idx_notifications_student_created
  ON public.notifications (student_id, created_at DESC);

-- 2. Accelerate student replacement request listing and eligibility checks
CREATE INDEX IF NOT EXISTS idx_doc_repl_requests_student_submitted
  ON public.document_replacement_requests (student_id, submitted_at DESC);

-- 3. Accelerate latest document version retrieval for Passports, Visas, and eFRRO
CREATE INDEX IF NOT EXISTS idx_passport_versions_student_created
  ON public.passport_versions (student_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_visa_versions_student_created
  ON public.visa_versions (student_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_efrro_versions_student_created
  ON public.efrro_versions (student_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMIT;

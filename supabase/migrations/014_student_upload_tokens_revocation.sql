-- Migration: 014_student_upload_tokens_revocation
-- Description: Adds revoked_at column to student_upload_tokens table and indexes expires_at for performance.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

ALTER TABLE public.student_upload_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_upload_tokens_expires ON public.student_upload_tokens (expires_at);

COMMIT;

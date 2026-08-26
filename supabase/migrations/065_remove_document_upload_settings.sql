-- Migration: 065_remove_document_upload_settings
-- Description: Drops obsolete document upload policies table and removes upload pre-expiry configuration structures.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Drop obsolete document_upload_policies table and any associated policies/triggers
DROP TABLE IF EXISTS public.document_upload_policies CASCADE;

-- 2. Drop student_document_upload_authorizations table if present
DROP TABLE IF EXISTS public.student_document_upload_authorizations CASCADE;

COMMIT;

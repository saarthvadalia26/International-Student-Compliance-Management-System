-- Migration: 013_default_retention_period
-- Description: Configures the default document retention period for eFRRO documents to 30 days in retention_policies table.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

UPDATE public.retention_policies 
SET retention_period_days = 30, grace_period_days = 0, updated_at = now()
WHERE document_type = 'efrro';

COMMIT;

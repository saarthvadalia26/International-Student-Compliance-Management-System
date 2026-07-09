-- Migration: 001_enable_extensions
-- Description: Prepares the PostgreSQL environment by enabling required cryptographic extensions.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Enable pgcrypto extension
-- Required to generate secure UUID v4 identifiers (via gen_random_uuid()) for all primary keys (ADR-001).
-- Also enables cryptographic hashing capabilities for system logging and data verification.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMIT;

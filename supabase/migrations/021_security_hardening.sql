-- Migration: 021_security_hardening
-- Description: Extends audit_log with structured details and category columns
--              for privileged action logging (Emergency Logout, Global Sign Out,
--              Role Changes, Configuration Changes). No breaking changes.
-- Transaction: Yes.

BEGIN;

-- 1. Extend audit_log with structured logging columns
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS details  JSONB       DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';

-- Category values:
--   'session'         → sign-out / force logout events
--   'role_change'     → privilege escalation / demotion
--   'config_change'   → system configuration modifications
--   'security'        → password resets, MFA, audit access
--   'general'         → everything else (default)

-- Severity values: 'info' | 'warning' | 'critical'

COMMENT ON COLUMN public.audit_log.category IS 'Category of the privileged action (session, role_change, config_change, security, general)';
COMMENT ON COLUMN public.audit_log.details  IS 'Structured JSON payload with action-specific metadata (sessions terminated, users affected, etc.)';
COMMENT ON COLUMN public.audit_log.severity IS 'Severity level: info | warning | critical';

-- 2. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.audit_log (category);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.audit_log (severity);

-- 3. Composite index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_audit_log_category_timestamp
  ON public.audit_log (category, timestamp DESC);

COMMIT;

-- ============================================================================
-- Supabase SQL Script — Purge Active Users & Sessions
-- Project: International Student Compliance Management System (ISCMS)
-- Institution: National Forensic Sciences University (NFSU)
-- ============================================================================
-- CAUTION: Execute this script in the Supabase Dashboard SQL Editor as `postgres` or `service_role`.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- OPTION 1: COMPLETE PURGE — Delete ALL user accounts & sessions from Supabase Auth
-- ----------------------------------------------------------------------------
-- Deleting from `auth.users` automatically cascades to:
--   - auth.sessions (all active sessions terminated)
--   - auth.refresh_tokens (all tokens invalidated)
--   - auth.identities
--   - auth.mfa_factors
-- ----------------------------------------------------------------------------

DELETE FROM auth.users;

-- OR if foreign keys require CASCADE:
-- TRUNCATE TABLE auth.users CASCADE;

-- ----------------------------------------------------------------------------
-- OPTION 2 (ALTERNATIVE): Terminate Active Sessions ONLY (Preserve Accounts)
-- ----------------------------------------------------------------------------
-- If you ONLY want to force-logout all active users without deleting their accounts:
--
-- DELETE FROM auth.sessions;
-- DELETE FROM auth.refresh_tokens;
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- OPTION 3 (ALTERNATIVE): Delete Staff/Student Users ONLY (Preserve Administrator)
-- ----------------------------------------------------------------------------
-- If you want to keep the root Administrator account and remove all other users:
--
-- DELETE FROM auth.users
-- WHERE (user_metadata->>'role') IS NULL 
--    OR (user_metadata->>'role') NOT IN ('administrator', 'admin');
-- ----------------------------------------------------------------------------

COMMIT;

-- Verify user purge status
SELECT 
  count(*) AS total_users_remaining,
  (SELECT count(*) FROM auth.sessions) AS active_sessions_remaining
FROM auth.users;

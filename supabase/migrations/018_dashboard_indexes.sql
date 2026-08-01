-- Migration: 018_dashboard_indexes
-- Description: Adds indexes to accelerate dashboard metric queries.
-- Dependencies: 005_documents.sql, 006_notifications.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- =====================================================================
-- Dashboard Performance Indexes
-- =====================================================================
-- These indexes target the exact WHERE clauses used by:
--   1. getDashboardMetrics() in report.repository.ts
--   2. fetchAnalyticsCharts() in dashboard/actions.ts
-- =====================================================================

-- 1. student_snapshot: eFRRO status filter (used in 5+ dashboard count queries)
CREATE INDEX IF NOT EXISTS idx_snapshot_efrro_status
  ON public.student_snapshot (efrro_status);

-- 2. student_snapshot: days_until_efrro_expiry range scans (30-day / 15-day windows)
CREATE INDEX IF NOT EXISTS idx_snapshot_days_efrro_expiry
  ON public.student_snapshot (days_until_efrro_expiry)
  WHERE days_until_efrro_expiry IS NOT NULL;

-- 3. notifications: status + created_at composite for "sent today" / "failed today" counts
CREATE INDEX IF NOT EXISTS idx_notifications_status_created
  ON public.notifications (status, created_at);

-- 4. notifications: channel filter for email/whatsapp split counts
CREATE INDEX IF NOT EXISTS idx_notifications_channel_status
  ON public.notifications (channel, status);

-- 5. document versions: pending verification composite indexes (active + pending + not deleted)
CREATE INDEX IF NOT EXISTS idx_passport_pending_review
  ON public.passport_versions (verification_status)
  WHERE is_active = TRUE AND deleted_at IS NULL AND verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_visa_pending_review
  ON public.visa_versions (verification_status)
  WHERE is_active = TRUE AND deleted_at IS NULL AND verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_efrro_pending_review
  ON public.efrro_versions (verification_status)
  WHERE is_active = TRUE AND deleted_at IS NULL AND verification_status = 'pending';

COMMIT;

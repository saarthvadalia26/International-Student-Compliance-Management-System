-- Migration: 012_enterprise_notifications
-- Description: Extends the notifications status check constraint and adds observability columns to delivery logs.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Extend notifications status constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check 
    CHECK (status IN ('queued', 'processing', 'sending', 'sent', 'delivered', 'read', 'failed', 'expired', 'cancelled'));

-- 2. Add observability and provider response columns to delivery log
ALTER TABLE public.notification_delivery_log ADD COLUMN IF NOT EXISTS correlation_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.notification_delivery_log ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT NULL;
ALTER TABLE public.notification_delivery_log ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100) DEFAULT NULL;

-- 3. Create indexes for performance lookup
CREATE INDEX IF NOT EXISTS idx_delivery_log_correlation ON public.notification_delivery_log (correlation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_provider ON public.notification_delivery_log (provider_name);

COMMIT;

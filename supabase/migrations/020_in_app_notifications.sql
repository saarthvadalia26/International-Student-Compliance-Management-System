-- Migration: 020_in_app_notifications
-- Description: Creates schema for in-app Notification Center supporting live header alerts, RLS security, and realtime subscriptions.
-- Dependencies: 001_enable_extensions.sql, 019_realtime_publication.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Create In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('student', 'document', 'reminder', 'system', 'security', 'audit')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    event_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ DEFAULT NULL,
    action_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for efficient lookup, unread counts, and sorting
CREATE INDEX IF NOT EXISTS idx_in_app_notif_user_unread ON public.in_app_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notif_category ON public.in_app_notifications (category, priority);

COMMENT ON TABLE public.in_app_notifications IS 'In-app notification instances displayed in the workspace header panel.';

-- 3. Row Level Security Setup
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own or broadcast notifications" 
ON public.in_app_notifications
FOR ALL 
USING (user_id IS NULL OR auth.uid() = user_id);

-- 4. Enable Supabase Realtime Publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice: in_app_notifications table may already be in publication.';
END $$;

-- 5. Seed Initial Operational Notifications for Daily University Audits
INSERT INTO public.in_app_notifications (title, description, category, priority, event_type, is_read, action_url, created_at) VALUES
('eFRRO Expiry Warning', 'Student STU-2026-089 (Kabulov Rustam) eFRRO expires in 7 days.', 'document', 'critical', 'efrro_uploaded', false, '/students/1/efrro', now() - INTERVAL '10 minutes'),
('New Student Registered', 'Student STU-2026-104 (Amina Patel) profile created by Admissions.', 'student', 'medium', 'student_added', false, '/students', now() - INTERVAL '35 minutes'),
('Passport Verification Approved', 'Passport for STU-2026-042 (Johnathan Smith) marked verified by Staff.', 'document', 'low', 'document_approved', false, '/students/1/passport', now() - INTERVAL '2 hours'),
('Meta WhatsApp Delivery Alert', 'Reminder message queued for +91 98765 43210 delivered successfully.', 'reminder', 'low', 'reminder_sent', true, '/reports/notifications', now() - INTERVAL '4 hours'),
('Login Security Audit Alert', 'Staff login detected from IP 14.139.122.10 (Gandhinagar Campus).', 'security', 'medium', 'audit_alerts', true, '/reports/audit', now() - INTERVAL '6 hours'),
('System Health Metrics Verified', 'Cloudflare R2 Object Storage and PostgreSQL health status green.', 'system', 'low', 'system_health', true, '/dashboard/health', now() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

COMMIT;

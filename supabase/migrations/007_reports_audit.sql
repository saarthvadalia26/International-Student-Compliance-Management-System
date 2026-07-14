-- Migration: 007_reports_audit
-- Description: Adds cache columns to student_snapshot, creates audit_log table, and deploys performance indices.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID DEFAULT NULL,
    actor_email VARCHAR(255) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    resource VARCHAR(100) NOT NULL,
    export_type VARCHAR(50) DEFAULT NULL,
    filters_applied JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log (timestamp DESC);

COMMENT ON TABLE public.audit_log IS 'Compliance security logs for tracing exports, unmasking PII, and document views.';

-- 2. Extend Student Snapshot Cache Table
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS passport_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS visa_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS efrro_number VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.student_snapshot ADD COLUMN IF NOT EXISTS days_until_efrro_expiry INT DEFAULT NULL;

-- 3. Optimization Indices for Search (Student Name, Reg, Passport, Visa, eFRRO, Email, Expiry)
CREATE INDEX IF NOT EXISTS idx_students_reg_num_search ON public.students (registration_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_personal_full_name_search ON public.student_personal (full_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_email_search ON public.student_contact (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_phone_home_search ON public.student_contact (phone_home) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_phone_local_search ON public.student_contact (phone_local) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_passport_num_search ON public.student_snapshot (passport_number);
CREATE INDEX IF NOT EXISTS idx_snapshot_visa_num_search ON public.student_snapshot (visa_number);
CREATE INDEX IF NOT EXISTS idx_snapshot_efrro_num_search ON public.student_snapshot (efrro_number);
CREATE INDEX IF NOT EXISTS idx_snapshot_efrro_days_expiry ON public.student_snapshot (days_until_efrro_expiry);

COMMIT;

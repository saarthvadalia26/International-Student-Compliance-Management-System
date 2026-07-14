-- Migration: 009_student_portal
-- Description: Creates student_upload_tokens, student_activity_log, and upload_audit_log tables for Sprint 06.
-- Dependencies: 003_students.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Create Student Upload Tokens Table
CREATE TABLE IF NOT EXISTS public.student_upload_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('UPLOAD', 'LOGIN', 'PASSWORDLESS_LOGIN')),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_tokens_hash ON public.student_upload_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_student ON public.student_upload_tokens (student_id);

COMMENT ON TABLE public.student_upload_tokens IS 'Stores hashed secure single-use tokens for renewal uploads and magic logins.';

-- 2. Create Student Activity Log Table
CREATE TABLE IF NOT EXISTS public.student_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_student_activity_student ON public.student_activity_log (student_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_timestamp ON public.student_activity_log (timestamp DESC);

COMMENT ON TABLE public.student_activity_log IS 'Tracks profile views, logins, and navigations inside the student portal.';

-- 3. Create Upload Audit Log Table
CREATE TABLE IF NOT EXISTS public.upload_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    status VARCHAR(25) NOT NULL CHECK (status IN ('success', 'failed_size', 'failed_type', 'failed_virus', 'failed_duplicate')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_audit_student ON public.upload_audit_log (student_id);
CREATE INDEX IF NOT EXISTS idx_upload_audit_checksum ON public.upload_audit_log (checksum);

COMMENT ON TABLE public.upload_audit_log IS 'Detailed audit records for file uploads and security scans.';

COMMIT;

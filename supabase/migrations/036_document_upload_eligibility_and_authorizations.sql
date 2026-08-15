-- Migration: 036_document_upload_eligibility_and_authorizations
-- Description: Adds configuration for pre-expiry upload window policies and student early upload exceptions/authorizations.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Document Upload Policies Table
CREATE TABLE IF NOT EXISTS public.document_upload_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(20) NOT NULL UNIQUE CHECK (document_type IN ('passport', 'visa', 'efrro')),
    upload_window_days INT NOT NULL CHECK (upload_window_days > 0 AND upload_window_days <= 365) DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_upload_policies IS 'Configured pre-expiry upload availability windows for students per document type.';

-- Seed default policies (30-day pre-expiry upload window for passport, visa, efrro)
INSERT INTO public.document_upload_policies (document_type, upload_window_days, is_active) VALUES
('passport', 30, true),
('visa', 30, true),
('efrro', 30, true)
ON CONFLICT (document_type) DO NOTHING;

-- 2. Student Document Upload Authorizations Table (Staff Exceptions)
CREATE TABLE IF NOT EXISTS public.student_document_upload_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro')),
    reason VARCHAR(100) NOT NULL CHECK (reason IN ('document_lost', 'document_damaged', 'document_replaced', 'government_reissue', 'data_correction', 'other')),
    reason_details TEXT NOT NULL CHECK (length(trim(reason_details)) > 0),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'revoked')),
    authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    consumed_version_id UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_upload_auth_valid_dates CHECK (valid_until > valid_from)
);

COMMENT ON TABLE public.student_document_upload_authorizations IS 'Staff-authorized early upload exceptions for lost, damaged, or renewed documents.';

-- Performance and query indexes
CREATE INDEX IF NOT EXISTS idx_upload_auth_student_active 
    ON public.student_document_upload_authorizations(student_id, document_type, status) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_upload_auth_student_created 
    ON public.student_document_upload_authorizations(student_id, created_at DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.document_upload_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_document_upload_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on upload policies" ON public.document_upload_policies;
DROP POLICY IF EXISTS "Allow staff/admin manage upload policies" ON public.document_upload_policies;
DROP POLICY IF EXISTS "Allow staff manage upload authorizations" ON public.student_document_upload_authorizations;
DROP POLICY IF EXISTS "Allow students read own upload authorizations" ON public.student_document_upload_authorizations;

-- Document Upload Policies: Read accessible to all authenticated users
CREATE POLICY "Allow authenticated read on upload policies"
    ON public.document_upload_policies
    FOR SELECT
    TO authenticated
    USING (true);

-- Document Upload Policies: Staff / Admin write access
CREATE POLICY "Allow staff/admin manage upload policies"
    ON public.document_upload_policies
    FOR ALL
    TO authenticated
    USING (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    )
    WITH CHECK (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    );

-- Student Upload Authorizations: Staff full access
CREATE POLICY "Allow staff manage upload authorizations"
    ON public.student_document_upload_authorizations
    FOR ALL
    TO authenticated
    USING (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    )
    WITH CHECK (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    );

-- Student Upload Authorizations: Students read their own authorizations
CREATE POLICY "Allow students read own upload authorizations"
    ON public.student_document_upload_authorizations
    FOR SELECT
    TO authenticated
    USING (
        student_id::text = (auth.jwt() -> 'user_metadata' ->> 'student_id')
        OR public.is_staff_ro()
    );

COMMIT;

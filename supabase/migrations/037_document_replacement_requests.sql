-- Migration: 037_document_replacement_requests
-- Description: Creates document_replacement_requests table with state machine rules, unique active request constraints, and RLS policies.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Create Document Replacement Requests Table
CREATE TABLE IF NOT EXISTS public.document_replacement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'efrro')),
    current_document_version INT DEFAULT NULL,
    current_expiry_date DATE DEFAULT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'passport_lost',
        'passport_damaged',
        'passport_renewed_early',
        'visa_renewed_reissued',
        'efrro_reissued',
        'government_replacement',
        'incorrect_document',
        'other'
    )),
    reason_details TEXT NOT NULL CHECK (length(trim(reason_details)) > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'expired',
        'completed'
    )),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    authorization_id UUID REFERENCES public.student_document_upload_authorizations(id) ON DELETE SET NULL,
    authorization_expires_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    completed_version_id UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_replacement_requests IS 'Student requests for early document replacement before normal pre-expiry window.';

-- 2. Indexes for State Enforcement and Fast Querying
-- Enforce: Only ONE pending replacement request per student + document type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_repl_req 
    ON public.document_replacement_requests(student_id, document_type) 
    WHERE status = 'pending';

-- Enforce: Only ONE active approved replacement request per student + document type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_approved_repl_req 
    ON public.document_replacement_requests(student_id, document_type) 
    WHERE status = 'approved';

-- Staff listing performance index
CREATE INDEX IF NOT EXISTS idx_doc_repl_requests_status_created 
    ON public.document_replacement_requests(status, created_at DESC);

-- Student history lookup index
CREATE INDEX IF NOT EXISTS idx_doc_repl_requests_student_created 
    ON public.document_replacement_requests(student_id, created_at DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.document_replacement_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff manage replacement requests" ON public.document_replacement_requests;
DROP POLICY IF EXISTS "Allow students read own replacement requests" ON public.document_replacement_requests;
DROP POLICY IF EXISTS "Allow students insert own replacement requests" ON public.document_replacement_requests;
DROP POLICY IF EXISTS "Allow students update own pending requests" ON public.document_replacement_requests;

-- Staff / Admin: Full CRUD access
CREATE POLICY "Allow staff manage replacement requests"
    ON public.document_replacement_requests
    FOR ALL
    TO authenticated
    USING (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    )
    WITH CHECK (
        public.is_staff_rw() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff')
    );

-- Authenticated Students: Read own replacement requests
CREATE POLICY "Allow students read own replacement requests"
    ON public.document_replacement_requests
    FOR SELECT
    TO authenticated
    USING (
        student_id::text = (auth.jwt() -> 'user_metadata' ->> 'student_id')
        OR public.is_staff_ro()
    );

-- Authenticated Students: Insert own replacement requests
CREATE POLICY "Allow students insert own replacement requests"
    ON public.document_replacement_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id::text = (auth.jwt() -> 'user_metadata' ->> 'student_id')
        OR public.is_staff_rw()
    );

-- Authenticated Students: Update own pending requests (e.g. cancel)
CREATE POLICY "Allow students update own pending requests"
    ON public.document_replacement_requests
    FOR UPDATE
    TO authenticated
    USING (
        (student_id::text = (auth.jwt() -> 'user_metadata' ->> 'student_id') AND status = 'pending')
        OR public.is_staff_rw()
    )
    WITH CHECK (
        (student_id::text = (auth.jwt() -> 'user_metadata' ->> 'student_id') AND status IN ('pending', 'cancelled'))
        OR public.is_staff_rw()
    );

COMMIT;

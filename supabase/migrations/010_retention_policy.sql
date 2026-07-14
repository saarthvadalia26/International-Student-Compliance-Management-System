-- Migration: 010_retention_policy
-- Description: Adds schema configurations for Document Retention Lifecycle: retention policy rules and logs.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Retention Policies Table
CREATE TABLE IF NOT EXISTS public.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(20) NOT NULL UNIQUE CHECK (document_type IN ('passport', 'visa', 'efrro')),
    retention_period_days INT NOT NULL CHECK (retention_period_days >= 0),
    archive_before_delete BOOLEAN NOT NULL DEFAULT true,
    grace_period_days INT NOT NULL CHECK (grace_period_days >= 0) DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.retention_policies IS 'Custom document purging and archiving lifespan rules per document type.';

-- Insert default rules for standard compliance records
INSERT INTO public.retention_policies (document_type, retention_period_days, archive_before_delete, grace_period_days) VALUES
('passport', 1825, true, 60),
('visa', 1825, true, 60),
('efrro', 365, true, 30)
ON CONFLICT (document_type) DO NOTHING;


-- 2. Retention Audit Log Table
CREATE TABLE IF NOT EXISTS public.retention_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(20) NOT NULL,
    version_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('archived', 'deleted', 'grace_warning_issued')),
    file_path VARCHAR(255) NOT NULL,
    dry_run BOOLEAN NOT NULL DEFAULT false,
    performed_by VARCHAR(150) NOT NULL DEFAULT 'System Scheduler',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.retention_audit_log IS 'Historical audit record logs of document archiving and permanent purges.';

COMMIT;

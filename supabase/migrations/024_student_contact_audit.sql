-- Migration: 024_student_contact_audit
-- Description: Creates student_contact_audit table to log contact number updates.
-- Dependencies: 003_students.sql
-- Transaction: Yes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_contact_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    previous_phone VARCHAR(50),
    new_phone VARCHAR(50) NOT NULL,
    updated_by UUID DEFAULT NULL,
    reason VARCHAR(255) DEFAULT 'Admin update',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_audit_student ON public.student_contact_audit (student_id);
CREATE INDEX IF NOT EXISTS idx_contact_audit_created ON public.student_contact_audit (created_at DESC);

COMMENT ON TABLE public.student_contact_audit IS 'Audit trail tracking all WhatsApp/phone number changes for students.';

COMMIT;

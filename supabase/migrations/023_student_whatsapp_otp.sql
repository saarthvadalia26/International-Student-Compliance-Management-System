-- Migration: 023_student_whatsapp_otp
-- Description: Creates student_otp_verifications table for WhatsApp OTP authentication.
-- Dependencies: 003_students.sql
-- Transaction: Yes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    mobile_number VARCHAR(25) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    attempts_count INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_otp_student ON public.student_otp_verifications (student_id);
CREATE INDEX IF NOT EXISTS idx_student_otp_mobile ON public.student_otp_verifications (mobile_number);
CREATE INDEX IF NOT EXISTS idx_student_otp_created ON public.student_otp_verifications (created_at DESC);

COMMENT ON TABLE public.student_otp_verifications IS 'Stores hashed secure single-use 6-digit WhatsApp OTPs for student login.';

COMMIT;

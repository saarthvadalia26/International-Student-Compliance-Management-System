-- Migration: 063_student_portal_removal_and_document_renewals
-- Description: Complete Student Portal removal, Document Renewal & Version History constraints,
-- notification template adjustments, and RLS security hardening for ISCMS production.
-- Dependencies: 005_documents.sql, 039_separate_document_metadata_and_versions.sql, 042_complete_template_manager_architecture.sql
-- Transaction: Yes.

BEGIN;

-- 1. Relax mandatory physical file_path constraint on document versions
-- This allows administrators to record document renewals with or without physical attachments
ALTER TABLE public.passport_versions
    DROP CONSTRAINT IF EXISTS chk_passport_file_path_required,
    DROP CONSTRAINT IF EXISTS chk_passport_file_path_not_empty;

ALTER TABLE public.passport_versions
    ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE public.visa_versions
    DROP CONSTRAINT IF EXISTS chk_visa_file_path_required,
    DROP CONSTRAINT IF EXISTS chk_visa_file_path_not_empty;

ALTER TABLE public.visa_versions
    ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE public.efrro_versions
    DROP CONSTRAINT IF EXISTS chk_efrro_file_path_required,
    DROP CONSTRAINT IF EXISTS chk_efrro_file_path_not_empty;

ALTER TABLE public.efrro_versions
    ALTER COLUMN file_path DROP NOT NULL;

-- 2. Concurrency and Uniqueness Constraints for Document Renewal Sequence Numbers
-- Ensure duplicate version sequence numbers are impossible per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_passport_version 
    ON public.passport_versions (student_id, version_number) 
    WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_visa_version 
    ON public.visa_versions (student_id, version_number) 
    WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_efrro_version 
    ON public.efrro_versions (student_id, version_number) 
    WHERE (deleted_at IS NULL);

-- Ensure only ONE active version per student exists at any time
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_passport 
    ON public.passport_versions (student_id) 
    WHERE (is_active = TRUE AND deleted_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_visa 
    ON public.visa_versions (student_id) 
    WHERE (is_active = TRUE AND deleted_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_efrro 
    ON public.efrro_versions (student_id) 
    WHERE (is_active = TRUE AND deleted_at IS NULL);

-- 3. Document Tables Comments Update
COMMENT ON TABLE public.passport_versions IS 'Complete audit history of student passport documents (Original = v1, Renewal 1 = v2, Renewal N = vN+1). Managed by university staff.';
COMMENT ON TABLE public.visa_versions IS 'Complete audit history of student visa documents (Original = v1, Renewal 1 = v2, Renewal N = vN+1). Managed by university staff.';
COMMENT ON TABLE public.efrro_versions IS 'Complete audit history of student eFRRO registrations (Original = v1, Renewal 1 = v2, Renewal N = vN+1). Managed by university staff.';

-- 4. Notification Templates Adjustments
-- Remove obsolete portal-only and replacement request templates
DELETE FROM public.notification_templates 
WHERE event_type IN ('portal_otp', 'replacement_approved', 'replacement_rejected')
   OR code IN ('STUDENT_PORTAL_OTP', 'DOC_REPLACEMENT_APPROVED', 'DOC_REPLACEMENT_REJECTED');

-- Update expiry alert templates with new workflow: instructions to email updated document to the university
UPDATE public.notification_templates
SET body_template = 'Dear {{student_name}},\n\nYour passport (Enrollment: {{enrollment_number}}) will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease initiate the renewal process in sufficient time. Once you receive your renewed passport, please email a clear copy to the International Student Office at {{compliance_email}}.\n\nRegards,\n{{institution_name}}'
WHERE code = 'PASSPORT_EXPIRY_ALERT';

UPDATE public.notification_templates
SET body_template = 'Dear {{student_name}},\n\nYour student visa (Enrollment: {{enrollment_number}}) will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease initiate the visa renewal or extension process before expiry. Once approved, email a clear copy of your renewed visa to {{compliance_email}} to maintain your legal academic status.\n\nRegards,\n{{institution_name}}'
WHERE code = 'VISA_EXPIRY_ALERT';

UPDATE public.notification_templates
SET body_template = 'Dear {{student_name}},\n\nYour eFRRO / Residential Permit will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease submit your renewal application on the government eFRRO portal and email your updated registration certificate to {{compliance_email}} before the expiration date.\n\nRegards,\n{{institution_name}}'
WHERE code = 'EFRRO_EXPIRY_ALERT';

UPDATE public.notification_templates
SET body_template = 'Dear {{student_name}},\n\nYour submitted {{document_type}} document could not be verified by the compliance team.\n\nReason for Revision:\n{{rejection_reason}}\n\nPlease email a clear, legible replacement copy of your {{document_type}} to {{compliance_email}} promptly.\n\nRegards,\n{{institution_name}}'
WHERE code = 'DOCUMENT_REJECTED';

-- 5. RLS Policy Hardening: Restrict Document Versions Strictly to Authenticated Staff / Admin
DROP POLICY IF EXISTS "Allow students read own passport" ON public.passport_versions;
DROP POLICY IF EXISTS "Allow students read own visa" ON public.visa_versions;
DROP POLICY IF EXISTS "Allow students read own efrro" ON public.efrro_versions;

DROP POLICY IF EXISTS "SELECT_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "INSERT_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "UPDATE_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "DELETE_passport_versions_StaffAdmin" ON public.passport_versions;

CREATE POLICY "SELECT_passport_versions_StaffAdmin" ON public.passport_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_passport_versions_StaffAdmin" ON public.passport_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_passport_versions_StaffAdmin" ON public.passport_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_passport_versions_StaffAdmin" ON public.passport_versions FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "SELECT_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "INSERT_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "UPDATE_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "DELETE_visa_versions_StaffAdmin" ON public.visa_versions;

CREATE POLICY "SELECT_visa_versions_StaffAdmin" ON public.visa_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_visa_versions_StaffAdmin" ON public.visa_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_visa_versions_StaffAdmin" ON public.visa_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_visa_versions_StaffAdmin" ON public.visa_versions FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "SELECT_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "INSERT_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "UPDATE_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "DELETE_efrro_versions_StaffAdmin" ON public.efrro_versions;

CREATE POLICY "SELECT_efrro_versions_StaffAdmin" ON public.efrro_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_efrro_versions_StaffAdmin" ON public.efrro_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_efrro_versions_StaffAdmin" ON public.efrro_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_efrro_versions_StaffAdmin" ON public.efrro_versions FOR DELETE USING (public.is_admin());

COMMIT;

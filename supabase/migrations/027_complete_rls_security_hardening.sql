-- Migration: 027_complete_rls_security_hardening.sql
-- Description: Complete Row Level Security (RLS) hardening across all 30 ISCMS application tables.
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: August 5, 2026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper Functions for Role-Based Access Control
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
      OR (auth.role() = 'service_role');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN TRUE;
  END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('administrator', 'admin')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('administrator', 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN TRUE;
  END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('administrator', 'admin', 'staff')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('administrator', 'admin', 'staff');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 30 TABLES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reference_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_embassy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efrro_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contact_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_lifecycle_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_otp_verifications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DROP OVERLY PERMISSIVE / OBSOLETE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow public read system_config" ON public.system_config;
DROP POLICY IF EXISTS "Allow service role write system_config" ON public.system_config;
DROP POLICY IF EXISTS "Users can access their own or broadcast notifications" ON public.in_app_notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. APPLY LEAST-PRIVILEGE POLICIES PER TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Table 1: reference_data (Public/Staff/Student READ, Admin Full CRUD, Service Role ALL)
DROP POLICY IF EXISTS "reference_data_read" ON public.reference_data;
DROP POLICY IF EXISTS "reference_data_admin_all" ON public.reference_data;
CREATE POLICY "reference_data_read" ON public.reference_data FOR SELECT USING (true);
CREATE POLICY "reference_data_admin_all" ON public.reference_data FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 2: iso_countries (Public/Staff/Student READ, Admin Full CRUD, Service Role ALL)
DROP POLICY IF EXISTS "iso_countries_read" ON public.iso_countries;
DROP POLICY IF EXISTS "iso_countries_admin_all" ON public.iso_countries;
CREATE POLICY "iso_countries_read" ON public.iso_countries FOR SELECT USING (true);
CREATE POLICY "iso_countries_admin_all" ON public.iso_countries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 3: academic_programs (Public/Staff/Student READ, Admin Full CRUD, Service Role ALL)
DROP POLICY IF EXISTS "academic_programs_read" ON public.academic_programs;
DROP POLICY IF EXISTS "academic_programs_admin_all" ON public.academic_programs;
CREATE POLICY "academic_programs_read" ON public.academic_programs FOR SELECT USING (true);
CREATE POLICY "academic_programs_admin_all" ON public.academic_programs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 4: system_config (Public SELECT for initialization check, Admin Full CRUD, Service Role ALL)
DROP POLICY IF EXISTS "system_config_read" ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_all" ON public.system_config;
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "system_config_admin_all" ON public.system_config FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 5: students (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "students_staff_admin_all" ON public.students;
DROP POLICY IF EXISTS "students_student_self" ON public.students;
CREATE POLICY "students_staff_admin_all" ON public.students FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "students_student_self" ON public.students FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Table 6: student_personal (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "student_personal_staff_admin_all" ON public.student_personal;
DROP POLICY IF EXISTS "student_personal_student_self" ON public.student_personal;
CREATE POLICY "student_personal_staff_admin_all" ON public.student_personal FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_personal_student_self" ON public.student_personal FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 7: student_contact (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "student_contact_staff_admin_all" ON public.student_contact;
DROP POLICY IF EXISTS "student_contact_student_self" ON public.student_contact;
CREATE POLICY "student_contact_staff_admin_all" ON public.student_contact FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_contact_student_self" ON public.student_contact FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 8: student_academic (Staff/Admin Full CRUD, Student SELECT own, Service Role ALL)
DROP POLICY IF EXISTS "student_academic_staff_admin_all" ON public.student_academic;
DROP POLICY IF EXISTS "student_academic_student_self" ON public.student_academic;
CREATE POLICY "student_academic_staff_admin_all" ON public.student_academic FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_academic_student_self" ON public.student_academic FOR SELECT USING (student_id = auth.uid());

-- Table 9: student_relationships (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "student_relationships_staff_admin_all" ON public.student_relationships;
DROP POLICY IF EXISTS "student_relationships_student_self" ON public.student_relationships;
CREATE POLICY "student_relationships_staff_admin_all" ON public.student_relationships FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_relationships_student_self" ON public.student_relationships FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 10: student_embassy (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "student_embassy_staff_admin_all" ON public.student_embassy;
DROP POLICY IF EXISTS "student_embassy_student_self" ON public.student_embassy;
CREATE POLICY "student_embassy_staff_admin_all" ON public.student_embassy FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_embassy_student_self" ON public.student_embassy FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 11: passport_versions (Staff/Admin Full CRUD, Student SELECT/INSERT own, Service Role ALL)
DROP POLICY IF EXISTS "passport_versions_staff_admin_all" ON public.passport_versions;
DROP POLICY IF EXISTS "passport_versions_student_self" ON public.passport_versions;
CREATE POLICY "passport_versions_staff_admin_all" ON public.passport_versions FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "passport_versions_student_self" ON public.passport_versions FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 12: visa_versions (Staff/Admin Full CRUD, Student SELECT/INSERT own, Service Role ALL)
DROP POLICY IF EXISTS "visa_versions_staff_admin_all" ON public.visa_versions;
DROP POLICY IF EXISTS "visa_versions_student_self" ON public.visa_versions;
CREATE POLICY "visa_versions_staff_admin_all" ON public.visa_versions FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "visa_versions_student_self" ON public.visa_versions FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 13: efrro_versions (Staff/Admin Full CRUD, Student SELECT/INSERT own, Service Role ALL)
DROP POLICY IF EXISTS "efrro_versions_staff_admin_all" ON public.efrro_versions;
DROP POLICY IF EXISTS "efrro_versions_student_self" ON public.efrro_versions;
CREATE POLICY "efrro_versions_staff_admin_all" ON public.efrro_versions FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "efrro_versions_student_self" ON public.efrro_versions FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 14: student_snapshot (Staff/Admin Full CRUD, Student SELECT own, Service Role ALL)
DROP POLICY IF EXISTS "student_snapshot_staff_admin_all" ON public.student_snapshot;
DROP POLICY IF EXISTS "student_snapshot_student_self" ON public.student_snapshot;
CREATE POLICY "student_snapshot_staff_admin_all" ON public.student_snapshot FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_snapshot_student_self" ON public.student_snapshot FOR SELECT USING (student_id = auth.uid());

-- Table 15: notification_templates (Admin Full CRUD, Staff SELECT, Student NO ACCESS, Service Role ALL)
DROP POLICY IF EXISTS "notification_templates_staff_admin" ON public.notification_templates;
CREATE POLICY "notification_templates_staff_admin" ON public.notification_templates FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_admin());

-- Table 16: student_notification_preferences (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "student_notif_pref_staff_admin" ON public.student_notification_preferences;
DROP POLICY IF EXISTS "student_notif_pref_student_self" ON public.student_notification_preferences;
CREATE POLICY "student_notif_pref_staff_admin" ON public.student_notification_preferences FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_notif_pref_student_self" ON public.student_notification_preferences FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 17: notifications (Staff/Admin Full CRUD, Student SELECT own, Service Role ALL)
DROP POLICY IF EXISTS "notifications_staff_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_student_self" ON public.notifications;
CREATE POLICY "notifications_staff_admin" ON public.notifications FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "notifications_student_self" ON public.notifications FOR SELECT USING (recipient_student_id = auth.uid());

-- Table 18: notification_delivery_log (Staff/Admin SELECT, Admin Full CRUD, Student NO ACCESS, Service Role ALL)
DROP POLICY IF EXISTS "notif_delivery_log_staff_admin" ON public.notification_delivery_log;
CREATE POLICY "notif_delivery_log_staff_admin" ON public.notification_delivery_log FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_admin());

-- Table 19: in_app_notifications (Staff/Admin Full CRUD, Student SELECT/UPDATE own, Service Role ALL)
DROP POLICY IF EXISTS "in_app_notif_staff_admin" ON public.in_app_notifications;
DROP POLICY IF EXISTS "in_app_notif_student_self" ON public.in_app_notifications;
CREATE POLICY "in_app_notif_staff_admin" ON public.in_app_notifications FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "in_app_notif_student_self" ON public.in_app_notifications FOR ALL USING (recipient_id = auth.uid() OR recipient_id IS NULL) WITH CHECK (recipient_id = auth.uid());

-- Table 20: reminder_rules (Admin Full CRUD, Staff SELECT, Student NO ACCESS, Service Role ALL)
DROP POLICY IF EXISTS "reminder_rules_staff_admin" ON public.reminder_rules;
CREATE POLICY "reminder_rules_staff_admin" ON public.reminder_rules FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_admin());

-- Table 21: scheduled_jobs (Admin Full CRUD, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "scheduled_jobs_admin" ON public.scheduled_jobs;
CREATE POLICY "scheduled_jobs_admin" ON public.scheduled_jobs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 22: audit_log (Admin SELECT/INSERT, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "audit_log_admin" ON public.audit_log;
CREATE POLICY "audit_log_admin" ON public.audit_log FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 23: student_contact_audit (Admin SELECT, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "student_contact_audit_admin" ON public.student_contact_audit;
CREATE POLICY "student_contact_audit_admin" ON public.student_contact_audit FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 24: upload_audit_log (Admin SELECT, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "upload_audit_log_admin" ON public.upload_audit_log;
CREATE POLICY "upload_audit_log_admin" ON public.upload_audit_log FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 25: retention_policies (Admin Full CRUD, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "retention_policies_admin" ON public.retention_policies;
CREATE POLICY "retention_policies_admin" ON public.retention_policies FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 26: retention_audit_log (Admin SELECT, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "retention_audit_log_admin" ON public.retention_audit_log;
CREATE POLICY "retention_audit_log_admin" ON public.retention_audit_log FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 27: document_lifecycle_audit_log (Admin SELECT, Service Role ALL, Staff/Student NO ACCESS)
DROP POLICY IF EXISTS "doc_lifecycle_audit_log_admin" ON public.document_lifecycle_audit_log;
CREATE POLICY "doc_lifecycle_audit_log_admin" ON public.document_lifecycle_audit_log FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Table 28: student_activity_log (Staff/Admin SELECT, Student SELECT own, Service Role ALL)
DROP POLICY IF EXISTS "student_activity_log_staff_admin" ON public.student_activity_log;
DROP POLICY IF EXISTS "student_activity_log_student_self" ON public.student_activity_log;
CREATE POLICY "student_activity_log_staff_admin" ON public.student_activity_log FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "student_activity_log_student_self" ON public.student_activity_log FOR SELECT USING (student_id = auth.uid());

-- Table 29: student_upload_tokens (Staff/Admin Full CRUD, Student SELECT/UPDATE own token, Service Role ALL)
DROP POLICY IF EXISTS "upload_tokens_staff_admin" ON public.student_upload_tokens;
DROP POLICY IF EXISTS "upload_tokens_student_self" ON public.student_upload_tokens;
CREATE POLICY "upload_tokens_staff_admin" ON public.student_upload_tokens FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "upload_tokens_student_self" ON public.student_upload_tokens FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table 30: student_otp_verifications (Service Role ONLY, Admin SELECT, Anon/Student NO ACCESS)
DROP POLICY IF EXISTS "otp_verifications_admin" ON public.student_otp_verifications;
CREATE POLICY "otp_verifications_admin" ON public.student_otp_verifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

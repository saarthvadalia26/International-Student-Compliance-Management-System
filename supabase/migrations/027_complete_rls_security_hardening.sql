-- Migration: 027_complete_rls_security_hardening.sql
-- Description: Complete Row Level Security (RLS) hardening generated from the live ISCMS database schema.
--              Dynamically discovers and enables RLS on all 29 actual tables created by migrations 001-026.
-- Target Institution: National Forensic Sciences University (NFSU)
-- Date: August 5, 2026

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper Functions for Role Authorization
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
  IF public.is_service_role() THEN RETURN TRUE; END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('administrator', 'admin')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('administrator', 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_rw()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() THEN RETURN TRUE; END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('staff', 'operations_staff', 'international_office_staff');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_ro()
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_service_role() OR public.is_admin() OR public.is_staff_rw() THEN RETURN TRUE; END IF;
  RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('read_only_staff', 'auditor')
      OR (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') IN ('read_only_staff', 'auditor');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DYNAMICALLY DISCOVER & ENABLE RLS ON ALL EXISTING PUBLIC TABLES
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
  existing_tables text[] := ARRAY[
    'reference_data',
    'academic_programs',
    'system_config',
    'students',
    'student_personal',
    'student_contact',
    'student_academic',
    'student_relationships',
    'student_embassy',
    'passport_versions',
    'visa_versions',
    'efrro_versions',
    'student_snapshot',
    'notification_templates',
    'student_notification_preferences',
    'notifications',
    'notification_delivery_log',
    'in_app_notifications',
    'reminder_rules',
    'scheduled_jobs',
    'audit_log',
    'student_contact_audit',
    'upload_audit_log',
    'retention_policies',
    'retention_audit_log',
    'document_lifecycle_audit_log',
    'student_activity_log',
    'student_upload_tokens',
    'student_otp_verifications'
  ];
BEGIN
  FOREACH t IN ARRAY existing_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DROP OBSOLETE & UNCLASSIFIED POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow public read system_config" ON public.system_config;
DROP POLICY IF EXISTS "Allow service role write system_config" ON public.system_config;
DROP POLICY IF EXISTS "Users can access their own or broadcast notifications" ON public.in_app_notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STANDARDIZED LEAST-PRIVILEGE POLICIES FOR EXISTING TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Table: reference_data
DROP POLICY IF EXISTS "SELECT_reference_data_Public" ON public.reference_data;
DROP POLICY IF EXISTS "INSERT_reference_data_Admin" ON public.reference_data;
DROP POLICY IF EXISTS "UPDATE_reference_data_Admin" ON public.reference_data;
DROP POLICY IF EXISTS "DELETE_reference_data_Admin" ON public.reference_data;
CREATE POLICY "SELECT_reference_data_Public" ON public.reference_data FOR SELECT USING (true);
CREATE POLICY "INSERT_reference_data_Admin" ON public.reference_data FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_reference_data_Admin" ON public.reference_data FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_reference_data_Admin" ON public.reference_data FOR DELETE USING (public.is_admin());

-- Table: academic_programs
DROP POLICY IF EXISTS "SELECT_academic_programs_Public" ON public.academic_programs;
DROP POLICY IF EXISTS "INSERT_academic_programs_Admin" ON public.academic_programs;
DROP POLICY IF EXISTS "UPDATE_academic_programs_Admin" ON public.academic_programs;
DROP POLICY IF EXISTS "DELETE_academic_programs_Admin" ON public.academic_programs;
CREATE POLICY "SELECT_academic_programs_Public" ON public.academic_programs FOR SELECT USING (true);
CREATE POLICY "INSERT_academic_programs_Admin" ON public.academic_programs FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_academic_programs_Admin" ON public.academic_programs FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_academic_programs_Admin" ON public.academic_programs FOR DELETE USING (public.is_admin());

-- Table: system_config
DROP POLICY IF EXISTS "SELECT_system_config_Public" ON public.system_config;
DROP POLICY IF EXISTS "INSERT_system_config_Admin" ON public.system_config;
DROP POLICY IF EXISTS "UPDATE_system_config_Admin" ON public.system_config;
DROP POLICY IF EXISTS "DELETE_system_config_Admin" ON public.system_config;
CREATE POLICY "SELECT_system_config_Public" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "INSERT_system_config_Admin" ON public.system_config FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_system_config_Admin" ON public.system_config FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_system_config_Admin" ON public.system_config FOR DELETE USING (public.is_admin());

-- Table: students
DROP POLICY IF EXISTS "SELECT_students_StaffAdmin" ON public.students;
DROP POLICY IF EXISTS "SELECT_students_StudentSelf" ON public.students;
DROP POLICY IF EXISTS "INSERT_students_StaffAdmin" ON public.students;
DROP POLICY IF EXISTS "UPDATE_students_StaffAdmin" ON public.students;
DROP POLICY IF EXISTS "UPDATE_students_StudentSelf" ON public.students;
DROP POLICY IF EXISTS "DELETE_students_Admin" ON public.students;
CREATE POLICY "SELECT_students_StaffAdmin" ON public.students FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_students_StudentSelf" ON public.students FOR SELECT USING (id = auth.uid());
CREATE POLICY "INSERT_students_StaffAdmin" ON public.students FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_students_StaffAdmin" ON public.students FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_students_StudentSelf" ON public.students FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "DELETE_students_Admin" ON public.students FOR DELETE USING (public.is_admin());

-- Table: student_personal
DROP POLICY IF EXISTS "SELECT_student_personal_StaffAdmin" ON public.student_personal;
DROP POLICY IF EXISTS "SELECT_student_personal_StudentSelf" ON public.student_personal;
DROP POLICY IF EXISTS "INSERT_student_personal_StaffAdmin" ON public.student_personal;
DROP POLICY IF EXISTS "UPDATE_student_personal_StaffAdmin" ON public.student_personal;
DROP POLICY IF EXISTS "UPDATE_student_personal_StudentSelf" ON public.student_personal;
DROP POLICY IF EXISTS "DELETE_student_personal_Admin" ON public.student_personal;
CREATE POLICY "SELECT_student_personal_StaffAdmin" ON public.student_personal FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_personal_StudentSelf" ON public.student_personal FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_personal_StaffAdmin" ON public.student_personal FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_personal_StaffAdmin" ON public.student_personal FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_personal_StudentSelf" ON public.student_personal FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "DELETE_student_personal_Admin" ON public.student_personal FOR DELETE USING (public.is_admin());

-- Table: student_contact
DROP POLICY IF EXISTS "SELECT_student_contact_StaffAdmin" ON public.student_contact;
DROP POLICY IF EXISTS "SELECT_student_contact_StudentSelf" ON public.student_contact;
DROP POLICY IF EXISTS "INSERT_student_contact_StaffAdmin" ON public.student_contact;
DROP POLICY IF EXISTS "UPDATE_student_contact_StaffAdmin" ON public.student_contact;
DROP POLICY IF EXISTS "UPDATE_student_contact_StudentSelf" ON public.student_contact;
DROP POLICY IF EXISTS "DELETE_student_contact_Admin" ON public.student_contact;
CREATE POLICY "SELECT_student_contact_StaffAdmin" ON public.student_contact FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_contact_StudentSelf" ON public.student_contact FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_contact_StaffAdmin" ON public.student_contact FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_contact_StaffAdmin" ON public.student_contact FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_contact_StudentSelf" ON public.student_contact FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "DELETE_student_contact_Admin" ON public.student_contact FOR DELETE USING (public.is_admin());

-- Table: student_academic
DROP POLICY IF EXISTS "SELECT_student_academic_StaffAdmin" ON public.student_academic;
DROP POLICY IF EXISTS "SELECT_student_academic_StudentSelf" ON public.student_academic;
DROP POLICY IF EXISTS "INSERT_student_academic_StaffAdmin" ON public.student_academic;
DROP POLICY IF EXISTS "UPDATE_student_academic_StaffAdmin" ON public.student_academic;
DROP POLICY IF EXISTS "DELETE_student_academic_Admin" ON public.student_academic;
CREATE POLICY "SELECT_student_academic_StaffAdmin" ON public.student_academic FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_academic_StudentSelf" ON public.student_academic FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_academic_StaffAdmin" ON public.student_academic FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_academic_StaffAdmin" ON public.student_academic FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_student_academic_Admin" ON public.student_academic FOR DELETE USING (public.is_admin());

-- Table: student_relationships
DROP POLICY IF EXISTS "SELECT_student_relationships_StaffAdmin" ON public.student_relationships;
DROP POLICY IF EXISTS "SELECT_student_relationships_StudentSelf" ON public.student_relationships;
DROP POLICY IF EXISTS "INSERT_student_relationships_StaffAdmin" ON public.student_relationships;
DROP POLICY IF EXISTS "UPDATE_student_relationships_StaffAdmin" ON public.student_relationships;
DROP POLICY IF EXISTS "UPDATE_student_relationships_StudentSelf" ON public.student_relationships;
DROP POLICY IF EXISTS "DELETE_student_relationships_Admin" ON public.student_relationships;
CREATE POLICY "SELECT_student_relationships_StaffAdmin" ON public.student_relationships FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_relationships_StudentSelf" ON public.student_relationships FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_relationships_StaffAdmin" ON public.student_relationships FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_relationships_StaffAdmin" ON public.student_relationships FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_relationships_StudentSelf" ON public.student_relationships FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "DELETE_student_relationships_Admin" ON public.student_relationships FOR DELETE USING (public.is_admin());

-- Table: student_embassy
DROP POLICY IF EXISTS "SELECT_student_embassy_StaffAdmin" ON public.student_embassy;
DROP POLICY IF EXISTS "SELECT_student_embassy_StudentSelf" ON public.student_embassy;
DROP POLICY IF EXISTS "INSERT_student_embassy_StaffAdmin" ON public.student_embassy;
DROP POLICY IF EXISTS "UPDATE_student_embassy_StaffAdmin" ON public.student_embassy;
DROP POLICY IF EXISTS "UPDATE_student_embassy_StudentSelf" ON public.student_embassy;
DROP POLICY IF EXISTS "DELETE_student_embassy_Admin" ON public.student_embassy;
CREATE POLICY "SELECT_student_embassy_StaffAdmin" ON public.student_embassy FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_embassy_StudentSelf" ON public.student_embassy FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_embassy_StaffAdmin" ON public.student_embassy FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_embassy_StaffAdmin" ON public.student_embassy FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "UPDATE_student_embassy_StudentSelf" ON public.student_embassy FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "DELETE_student_embassy_Admin" ON public.student_embassy FOR DELETE USING (public.is_admin());

-- Table: passport_versions
DROP POLICY IF EXISTS "SELECT_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "SELECT_passport_versions_StudentSelf" ON public.passport_versions;
DROP POLICY IF EXISTS "INSERT_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "INSERT_passport_versions_StudentSelf" ON public.passport_versions;
DROP POLICY IF EXISTS "UPDATE_passport_versions_StaffAdmin" ON public.passport_versions;
DROP POLICY IF EXISTS "DELETE_passport_versions_Admin" ON public.passport_versions;
CREATE POLICY "SELECT_passport_versions_StaffAdmin" ON public.passport_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_passport_versions_StudentSelf" ON public.passport_versions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_passport_versions_StaffAdmin" ON public.passport_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "INSERT_passport_versions_StudentSelf" ON public.passport_versions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "UPDATE_passport_versions_StaffAdmin" ON public.passport_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_passport_versions_Admin" ON public.passport_versions FOR DELETE USING (public.is_admin());

-- Table: visa_versions
DROP POLICY IF EXISTS "SELECT_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "SELECT_visa_versions_StudentSelf" ON public.visa_versions;
DROP POLICY IF EXISTS "INSERT_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "INSERT_visa_versions_StudentSelf" ON public.visa_versions;
DROP POLICY IF EXISTS "UPDATE_visa_versions_StaffAdmin" ON public.visa_versions;
DROP POLICY IF EXISTS "DELETE_visa_versions_Admin" ON public.visa_versions;
CREATE POLICY "SELECT_visa_versions_StaffAdmin" ON public.visa_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_visa_versions_StudentSelf" ON public.visa_versions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_visa_versions_StaffAdmin" ON public.visa_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "INSERT_visa_versions_StudentSelf" ON public.visa_versions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "UPDATE_visa_versions_StaffAdmin" ON public.visa_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_visa_versions_Admin" ON public.visa_versions FOR DELETE USING (public.is_admin());

-- Table: efrro_versions
DROP POLICY IF EXISTS "SELECT_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "SELECT_efrro_versions_StudentSelf" ON public.efrro_versions;
DROP POLICY IF EXISTS "INSERT_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "INSERT_efrro_versions_StudentSelf" ON public.efrro_versions;
DROP POLICY IF EXISTS "UPDATE_efrro_versions_StaffAdmin" ON public.efrro_versions;
DROP POLICY IF EXISTS "DELETE_efrro_versions_Admin" ON public.efrro_versions;
CREATE POLICY "SELECT_efrro_versions_StaffAdmin" ON public.efrro_versions FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_efrro_versions_StudentSelf" ON public.efrro_versions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_efrro_versions_StaffAdmin" ON public.efrro_versions FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "INSERT_efrro_versions_StudentSelf" ON public.efrro_versions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "UPDATE_efrro_versions_StaffAdmin" ON public.efrro_versions FOR UPDATE USING (public.is_staff_rw()) WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_efrro_versions_Admin" ON public.efrro_versions FOR DELETE USING (public.is_admin());

-- Table: student_snapshot
DROP POLICY IF EXISTS "SELECT_student_snapshot_StaffAdmin" ON public.student_snapshot;
DROP POLICY IF EXISTS "SELECT_student_snapshot_StudentSelf" ON public.student_snapshot;
DROP POLICY IF EXISTS "INSERT_student_snapshot_StaffAdmin" ON public.student_snapshot;
DROP POLICY IF EXISTS "DELETE_student_snapshot_Admin" ON public.student_snapshot;
CREATE POLICY "SELECT_student_snapshot_StaffAdmin" ON public.student_snapshot FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_snapshot_StudentSelf" ON public.student_snapshot FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_student_snapshot_StaffAdmin" ON public.student_snapshot FOR INSERT WITH CHECK (public.is_staff_rw());
CREATE POLICY "DELETE_student_snapshot_Admin" ON public.student_snapshot FOR DELETE USING (public.is_admin());

-- Table: notification_templates
DROP POLICY IF EXISTS "SELECT_notification_templates_StaffAdmin" ON public.notification_templates;
DROP POLICY IF EXISTS "INSERT_notification_templates_Admin" ON public.notification_templates;
DROP POLICY IF EXISTS "UPDATE_notification_templates_Admin" ON public.notification_templates;
DROP POLICY IF EXISTS "DELETE_notification_templates_Admin" ON public.notification_templates;
CREATE POLICY "SELECT_notification_templates_StaffAdmin" ON public.notification_templates FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_notification_templates_Admin" ON public.notification_templates FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_notification_templates_Admin" ON public.notification_templates FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_notification_templates_Admin" ON public.notification_templates FOR DELETE USING (public.is_admin());

-- Table: student_notification_preferences
DROP POLICY IF EXISTS "SELECT_student_notif_pref_StaffAdmin" ON public.student_notification_preferences;
DROP POLICY IF EXISTS "SELECT_student_notif_pref_StudentSelf" ON public.student_notification_preferences;
DROP POLICY IF EXISTS "UPDATE_student_notif_pref_StudentSelf" ON public.student_notification_preferences;
CREATE POLICY "SELECT_student_notif_pref_StaffAdmin" ON public.student_notification_preferences FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_notif_pref_StudentSelf" ON public.student_notification_preferences FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "UPDATE_student_notif_pref_StudentSelf" ON public.student_notification_preferences FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table: notifications
DROP POLICY IF EXISTS "SELECT_notifications_StaffAdmin" ON public.notifications;
DROP POLICY IF EXISTS "SELECT_notifications_StudentSelf" ON public.notifications;
DROP POLICY IF EXISTS "INSERT_notifications_StaffAdmin" ON public.notifications;
CREATE POLICY "SELECT_notifications_StaffAdmin" ON public.notifications FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_notifications_StudentSelf" ON public.notifications FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "INSERT_notifications_StaffAdmin" ON public.notifications FOR INSERT WITH CHECK (public.is_staff_rw());

-- Table: notification_delivery_log
DROP POLICY IF EXISTS "SELECT_notification_delivery_log_StaffAdmin" ON public.notification_delivery_log;
CREATE POLICY "SELECT_notification_delivery_log_StaffAdmin" ON public.notification_delivery_log FOR SELECT USING (public.is_staff_ro());

-- Table: in_app_notifications
DROP POLICY IF EXISTS "SELECT_in_app_notifications_StaffAdmin" ON public.in_app_notifications;
DROP POLICY IF EXISTS "SELECT_in_app_notifications_StudentSelf" ON public.in_app_notifications;
DROP POLICY IF EXISTS "UPDATE_in_app_notifications_StudentSelf" ON public.in_app_notifications;
CREATE POLICY "SELECT_in_app_notifications_StaffAdmin" ON public.in_app_notifications FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_in_app_notifications_StudentSelf" ON public.in_app_notifications FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "UPDATE_in_app_notifications_StudentSelf" ON public.in_app_notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Table: reminder_rules
DROP POLICY IF EXISTS "SELECT_reminder_rules_StaffAdmin" ON public.reminder_rules;
DROP POLICY IF EXISTS "INSERT_reminder_rules_Admin" ON public.reminder_rules;
DROP POLICY IF EXISTS "UPDATE_reminder_rules_Admin" ON public.reminder_rules;
DROP POLICY IF EXISTS "DELETE_reminder_rules_Admin" ON public.reminder_rules;
CREATE POLICY "SELECT_reminder_rules_StaffAdmin" ON public.reminder_rules FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "INSERT_reminder_rules_Admin" ON public.reminder_rules FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_reminder_rules_Admin" ON public.reminder_rules FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_reminder_rules_Admin" ON public.reminder_rules FOR DELETE USING (public.is_admin());

-- Table: scheduled_jobs
DROP POLICY IF EXISTS "SELECT_scheduled_jobs_Admin" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "INSERT_scheduled_jobs_Admin" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "UPDATE_scheduled_jobs_Admin" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "DELETE_scheduled_jobs_Admin" ON public.scheduled_jobs;
CREATE POLICY "SELECT_scheduled_jobs_Admin" ON public.scheduled_jobs FOR SELECT USING (public.is_admin());
CREATE POLICY "INSERT_scheduled_jobs_Admin" ON public.scheduled_jobs FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_scheduled_jobs_Admin" ON public.scheduled_jobs FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_scheduled_jobs_Admin" ON public.scheduled_jobs FOR DELETE USING (public.is_admin());

-- Table: audit_log
DROP POLICY IF EXISTS "SELECT_audit_log_Admin" ON public.audit_log;
DROP POLICY IF EXISTS "INSERT_audit_log_Admin" ON public.audit_log;
CREATE POLICY "SELECT_audit_log_Admin" ON public.audit_log FOR SELECT USING (public.is_admin());
CREATE POLICY "INSERT_audit_log_Admin" ON public.audit_log FOR INSERT WITH CHECK (public.is_admin());

-- Table: student_contact_audit
DROP POLICY IF EXISTS "SELECT_student_contact_audit_Admin" ON public.student_contact_audit;
CREATE POLICY "SELECT_student_contact_audit_Admin" ON public.student_contact_audit FOR SELECT USING (public.is_admin());

-- Table: upload_audit_log
DROP POLICY IF EXISTS "SELECT_upload_audit_log_Admin" ON public.upload_audit_log;
CREATE POLICY "SELECT_upload_audit_log_Admin" ON public.upload_audit_log FOR SELECT USING (public.is_admin());

-- Table: retention_policies
DROP POLICY IF EXISTS "SELECT_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "INSERT_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "UPDATE_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "DELETE_retention_policies_Admin" ON public.retention_policies;
CREATE POLICY "SELECT_retention_policies_Admin" ON public.retention_policies FOR SELECT USING (public.is_admin());
CREATE POLICY "INSERT_retention_policies_Admin" ON public.retention_policies FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "UPDATE_retention_policies_Admin" ON public.retention_policies FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "DELETE_retention_policies_Admin" ON public.retention_policies FOR DELETE USING (public.is_admin());

-- Table: retention_audit_log
DROP POLICY IF EXISTS "SELECT_retention_audit_log_Admin" ON public.retention_audit_log;
CREATE POLICY "SELECT_retention_audit_log_Admin" ON public.retention_audit_log FOR SELECT USING (public.is_admin());

-- Table: document_lifecycle_audit_log
DROP POLICY IF EXISTS "SELECT_document_lifecycle_audit_log_Admin" ON public.document_lifecycle_audit_log;
CREATE POLICY "SELECT_document_lifecycle_audit_log_Admin" ON public.document_lifecycle_audit_log FOR SELECT USING (public.is_admin());

-- Table: student_activity_log
DROP POLICY IF EXISTS "SELECT_student_activity_log_StaffAdmin" ON public.student_activity_log;
DROP POLICY IF EXISTS "SELECT_student_activity_log_StudentSelf" ON public.student_activity_log;
CREATE POLICY "SELECT_student_activity_log_StaffAdmin" ON public.student_activity_log FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_activity_log_StudentSelf" ON public.student_activity_log FOR SELECT USING (student_id = auth.uid());

-- Table: student_upload_tokens
DROP POLICY IF EXISTS "SELECT_student_upload_tokens_StaffAdmin" ON public.student_upload_tokens;
DROP POLICY IF EXISTS "SELECT_student_upload_tokens_StudentSelf" ON public.student_upload_tokens;
DROP POLICY IF EXISTS "UPDATE_student_upload_tokens_StudentSelf" ON public.student_upload_tokens;
CREATE POLICY "SELECT_student_upload_tokens_StaffAdmin" ON public.student_upload_tokens FOR SELECT USING (public.is_staff_ro());
CREATE POLICY "SELECT_student_upload_tokens_StudentSelf" ON public.student_upload_tokens FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "UPDATE_student_upload_tokens_StudentSelf" ON public.student_upload_tokens FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Table: student_otp_verifications
DROP POLICY IF EXISTS "SELECT_student_otp_verifications_Admin" ON public.student_otp_verifications;
CREATE POLICY "SELECT_student_otp_verifications_Admin" ON public.student_otp_verifications FOR SELECT USING (public.is_admin());

COMMIT;

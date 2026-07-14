-- Migration: 008_cleanup_demo_data
-- Description: Clean up all demo students, document versions, notifications, scheduled jobs, and audit logs.
-- Dependencies: 003_students.sql, 004_student_details.sql, 005_documents.sql, 006_notifications.sql, 007_reports_audit.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Truncate parent students table which automatically cascades to all dependent child records
-- This deletes all student_personal, student_contact, student_academic, student_relationships,
-- student_embassy, passport_versions, visa_versions, efrro_versions, student_snapshot,
-- notifications, and notification_delivery_log records.
TRUNCATE TABLE public.students CASCADE;

-- 2. Truncate scheduled jobs logs table to clear developer mock runs
TRUNCATE TABLE public.scheduled_jobs CASCADE;

-- 3. Truncate audit log table to clear mock compliance logging
TRUNCATE TABLE public.audit_log CASCADE;

COMMIT;

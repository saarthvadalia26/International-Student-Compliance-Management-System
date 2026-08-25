-- Migration: 064_remove_retention_policies
-- Description: Completely removes obsolete retention_policies and retention_audit_log tables,
-- RLS security policies, and realtime publication references.
-- Dependencies: 010_retention_policy.sql, 028_enterprise_rls_policy_standardization.sql
-- Transaction: Yes.

BEGIN;

-- 1. Remove tables from realtime publication if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'retention_policies'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.retention_policies;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'retention_audit_log'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.retention_audit_log;
    END IF;
END $$;

-- 2. Drop RLS Policies on retention_policies
DROP POLICY IF EXISTS "SELECT_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "INSERT_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "UPDATE_retention_policies_Admin" ON public.retention_policies;
DROP POLICY IF EXISTS "DELETE_retention_policies_Admin" ON public.retention_policies;

-- 3. Drop RLS Policies on retention_audit_log
DROP POLICY IF EXISTS "SELECT_retention_audit_log_Admin" ON public.retention_audit_log;
DROP POLICY IF EXISTS "INSERT_retention_audit_log_Admin" ON public.retention_audit_log;
DROP POLICY IF EXISTS "UPDATE_retention_audit_log_Admin" ON public.retention_audit_log;
DROP POLICY IF EXISTS "DELETE_retention_audit_log_Admin" ON public.retention_audit_log;

-- 4. Drop Tables with CASCADE
DROP TABLE IF EXISTS public.retention_audit_log CASCADE;
DROP TABLE IF EXISTS public.retention_policies CASCADE;

COMMIT;

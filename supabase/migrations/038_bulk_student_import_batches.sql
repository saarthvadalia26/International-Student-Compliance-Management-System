-- Migration: 038_bulk_student_import_batches
-- Description: Creates import_batches table to track and audit bulk student imports from Excel/CSV,
--              and links students to their origin import batch for traceability and rollback.
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Create Import Batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    total_rows INT NOT NULL DEFAULT 0,
    imported_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'rolled_back')),
    error_summary JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    rolled_back_at TIMESTAMPTZ DEFAULT NULL,
    rolled_back_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.import_batches IS 'Auditable log of bulk student data imports from Excel and CSV spreadsheets.';

-- 2. Add import_batch_id column to students table
ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

-- 3. Indexes for Fast Lookups and Recovery Operations
CREATE INDEX IF NOT EXISTS idx_students_import_batch 
    ON public.students(import_batch_id) 
    WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_import_batches_created 
    ON public.import_batches(created_at DESC);

-- 4. Row Level Security Policies
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin manage import batches" ON public.import_batches;
DROP POLICY IF EXISTS "Allow staff read import batches" ON public.import_batches;

-- Admin: Full management access
CREATE POLICY "Allow admin manage import batches"
    ON public.import_batches
    FOR ALL
    TO authenticated
    USING (
        public.is_admin() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin')
    )
    WITH CHECK (
        public.is_admin() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin')
    );

-- Read access for compliance staff/auditors
CREATE POLICY "Allow staff read import batches"
    ON public.import_batches
    FOR SELECT
    TO authenticated
    USING (
        public.is_staff_ro() OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'administrator', 'superadmin', 'compliance_officer', 'staff', 'auditor')
    );

COMMIT;

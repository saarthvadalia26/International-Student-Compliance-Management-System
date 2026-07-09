-- Migration: 003_students
-- Description: Creates the core students table with soft delete and standard audit columns.
-- Dependencies: 001_enable_extensions.sql, 002_reference_data.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.students (
    -- UUID primary key generated via gen_random_uuid() satisfying ADR-001
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Unique institutional student registration number
    registration_number VARCHAR(50) NOT NULL,
    
    -- Student enrollment status with strict check constraint (DDS Section 3)
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Audit columns for tracking creation and modification context
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints
    -- Enforce uniqueness on active/suspended student records (BR-001)
    CONSTRAINT unique_registration_number UNIQUE (registration_number),
    
    -- Validate allowed status options
    CONSTRAINT chk_student_status CHECK (status IN ('active', 'suspended', 'graduated', 'withdrawn')),
    
    -- Safeguard registration number from being empty or whitespace-only
    CONSTRAINT chk_registration_number_not_empty CHECK (length(trim(registration_number)) > 0)
);

-- Indexes for performance (DIP Section 2 & DDS Section 12)
-- Partial index to speed up default directories querying active (non-soft-deleted) records
CREATE INDEX IF NOT EXISTS students_active_idx ON public.students (registration_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS students_deleted_at_idx ON public.students (deleted_at) WHERE deleted_at IS NULL;

-- Documentation comments
COMMENT ON TABLE public.students IS 'Core student identity records for compliance audits.';
COMMENT ON COLUMN public.students.id IS 'UUID primary key generated via gen_random_uuid().';
COMMENT ON COLUMN public.students.registration_number IS 'Unique institutional identifier.';
COMMENT ON COLUMN public.students.status IS 'Enrollment status (active, suspended, graduated, withdrawn).';
COMMENT ON COLUMN public.students.created_at IS 'Timestamp when the student profile was registered.';
COMMENT ON COLUMN public.students.updated_at IS 'Timestamp when the student profile was last modified.';
COMMENT ON COLUMN public.students.deleted_at IS 'Timestamp marking soft deletion of the student record.';
COMMENT ON COLUMN public.students.created_by IS 'Reference to the auth user who created the record.';
COMMENT ON COLUMN public.students.updated_by IS 'Reference to the auth user who last modified the record.';

COMMIT;

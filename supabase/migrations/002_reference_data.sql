-- Migration: 002_reference_data
-- Description: Creates the consolidated reference_data lookup table.
-- Dependencies: 001_enable_extensions.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.reference_data (
    -- UUID primary key generated via gen_random_uuid() satisfying ADR-001
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category grouping to organize lookup values
    category VARCHAR(50) NOT NULL,
    
    -- Globally unique code identifier referenced by foreign keys (e.g., 'VISA_STUDENT', 'MALE')
    code VARCHAR(20) NOT NULL,
    
    -- Human-friendly display label (e.g., 'Student Visa', 'Male')
    display_name VARCHAR(100) NOT NULL,
    
    -- Detailed definition or context for administrative users
    description TEXT,
    
    -- Order in which lookup options should be displayed in selection dropdowns
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Status flag allowing soft deprecation of items without deleting them
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit timestamps tracking row creation and modification times
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    -- Enforce that code is globally unique so child tables can reference it as a foreign key
    CONSTRAINT unique_reference_code UNIQUE (code),
    
    -- Ensure category belongs to the approved list of system configurations
    CONSTRAINT check_valid_category CHECK (category IN (
        'sponsorship_category',
        'visa_type',
        'gender',
        'marital_status',
        'blood_group',
        'school',
        'course',
        'fee_type',
        'document_status',
        'notification_channel',
        'notification_status'
    )),
    
    -- Prevent empty or whitespace-only inputs
    CONSTRAINT check_category_not_empty CHECK (length(trim(category)) > 0),
    CONSTRAINT check_code_not_empty CHECK (length(trim(code)) > 0),
    CONSTRAINT check_display_name_not_empty CHECK (length(trim(display_name)) > 0),
    
    -- Prevent whitespace inside codes (codes should be continuous strings like 'STUDENT_VISA' or 'MALE')
    CONSTRAINT check_code_no_whitespace CHECK (code !~ '\s'),
    
    -- Enforce positive display ordering
    CONSTRAINT check_display_order_non_negative CHECK (display_order >= 0)
);

-- Documentation comments for PostgreSQL schema catalog
COMMENT ON TABLE public.reference_data IS 'Consolidated lookup table for static and configurable system categories.';
COMMENT ON COLUMN public.reference_data.id IS 'UUID primary key generated via gen_random_uuid().';
COMMENT ON COLUMN public.reference_data.category IS 'Group classification key (e.g., visa_type, gender, school).';
COMMENT ON COLUMN public.reference_data.code IS 'Globally unique string identifier used as a foreign key reference.';
COMMENT ON COLUMN public.reference_data.display_name IS 'Friendly user-facing label.';
COMMENT ON COLUMN public.reference_data.description IS 'Optional detailed description or administrative notes.';
COMMENT ON COLUMN public.reference_data.display_order IS 'Ordering sequence for client-side selection UI components.';
COMMENT ON COLUMN public.reference_data.is_active IS 'Flag to toggle item visibility without hard deletion.';
COMMENT ON COLUMN public.reference_data.created_at IS 'Timestamp when the row was created.';
COMMENT ON COLUMN public.reference_data.updated_at IS 'Timestamp when the row was last modified.';

COMMIT;

-- Migration: 005_documents
-- Description: Creates versioned tables for Passports, Visas, and eFRRO, plus the cached student_snapshot table.
-- Dependencies: 001_enable_extensions.sql, 003_students.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Passport Versions Table
CREATE TABLE IF NOT EXISTS public.passport_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by UUID DEFAULT NULL,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_passport_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT fk_passport_verified_by FOREIGN KEY (verified_by) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT chk_passport_expiry_after_issue CHECK (expiry_date > issue_date),
    CONSTRAINT chk_passport_number_not_empty CHECK (length(trim(document_number)) > 0),
    CONSTRAINT chk_passport_file_path_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT chk_passport_version_positive CHECK (version_number > 0),
    CONSTRAINT chk_passport_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- Partial unique index: Ensure at most one active (non-soft-deleted) passport version per student
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_passport ON public.passport_versions (student_id) WHERE (is_active = TRUE AND deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS passport_versions_student_idx ON public.passport_versions (student_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.passport_versions IS 'History of uploaded passport versions.';
COMMENT ON COLUMN public.passport_versions.id IS 'UUID primary key.';
COMMENT ON COLUMN public.passport_versions.student_id IS 'Reference to the student ID.';
COMMENT ON COLUMN public.passport_versions.version_number IS 'Sequence version number tracking updates.';
COMMENT ON COLUMN public.passport_versions.is_active IS 'True if this is the active passport version.';


-- 2. Visa Versions Table
CREATE TABLE IF NOT EXISTS public.visa_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by UUID DEFAULT NULL,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_visa_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT fk_visa_verified_by FOREIGN KEY (verified_by) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT chk_visa_expiry_after_issue CHECK (expiry_date > issue_date),
    CONSTRAINT chk_visa_number_not_empty CHECK (length(trim(document_number)) > 0),
    CONSTRAINT chk_visa_file_path_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT chk_visa_version_positive CHECK (version_number > 0),
    CONSTRAINT chk_visa_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- Partial unique index: Ensure at most one active (non-soft-deleted) visa version per student
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_visa ON public.visa_versions (student_id) WHERE (is_active = TRUE AND deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS visa_versions_student_idx ON public.visa_versions (student_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.visa_versions IS 'History of uploaded visa versions.';


-- 3. eFRRO Versions Table
CREATE TABLE IF NOT EXISTS public.efrro_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by UUID DEFAULT NULL,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_efrro_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT fk_efrro_verified_by FOREIGN KEY (verified_by) REFERENCES auth.users (id) ON DELETE SET NULL,
    CONSTRAINT chk_efrro_expiry_after_issue CHECK (expiry_date > issue_date),
    CONSTRAINT chk_efrro_number_not_empty CHECK (length(trim(document_number)) > 0),
    CONSTRAINT chk_efrro_file_path_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT chk_efrro_version_positive CHECK (version_number > 0),
    CONSTRAINT chk_efrro_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- Partial unique index: Ensure at most one active (non-soft-deleted) eFRRO version per student
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_efrro ON public.efrro_versions (student_id) WHERE (is_active = TRUE AND deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS efrro_versions_student_idx ON public.efrro_versions (student_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.efrro_versions IS 'History of uploaded eFRRO certificate versions.';


-- 4. Student Snapshot Cache Table
CREATE TABLE IF NOT EXISTS public.student_snapshot (
    student_id UUID PRIMARY KEY,
    
    -- Passport Status & Expiry
    passport_status VARCHAR(25) NOT NULL DEFAULT 'MISSING',
    passport_expiry DATE DEFAULT NULL,
    
    -- Visa Status & Expiry
    visa_status VARCHAR(25) NOT NULL DEFAULT 'MISSING',
    visa_expiry DATE DEFAULT NULL,
    
    -- eFRRO Status & Expiry
    efrro_status VARCHAR(25) NOT NULL DEFAULT 'MISSING',
    efrro_expiry DATE DEFAULT NULL,
    
    -- Core Cached Calculations
    compliance_score INT NOT NULL DEFAULT 0,
    compliance_status VARCHAR(25) NOT NULL DEFAULT 'MISSING',
    days_until_expiry INT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT fk_snapshot_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT chk_snapshot_compliance_score CHECK (compliance_score >= 0 AND compliance_score <= 100),
    CONSTRAINT chk_snapshot_passport_status CHECK (passport_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING')),
    CONSTRAINT chk_snapshot_visa_status CHECK (visa_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING')),
    CONSTRAINT chk_snapshot_efrro_status CHECK (efrro_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING')),
    CONSTRAINT chk_snapshot_compliance_status CHECK (compliance_status IN ('COMPLIANT', 'WARNING', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED', 'MISSING'))
);

CREATE INDEX IF NOT EXISTS snapshot_compliance_status_idx ON public.student_snapshot (compliance_status);

COMMENT ON TABLE public.student_snapshot IS 'Cached metrics of student compliance tracking for dashboard summaries.';
COMMENT ON COLUMN public.student_snapshot.student_id IS 'Primary key referencing students(id) on cascade delete.';
COMMENT ON COLUMN public.student_snapshot.compliance_score IS 'Evaluated score out of 100 points.';
COMMENT ON COLUMN public.student_snapshot.compliance_status IS 'Global compliance status calculated from standard evaluation.';

COMMIT;

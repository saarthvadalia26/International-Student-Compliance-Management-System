-- Migration: 004_student_details
-- Description: Creates normalized student detail tables with standard audit columns and referential constraints.
-- Dependencies: 002_reference_data.sql, 003_students.sql
-- Transaction: Yes. Runs inside a transaction.

BEGIN;

-- 1. Student Personal Table
CREATE TABLE IF NOT EXISTS public.student_personal (
    student_id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    nationality_code VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_group VARCHAR(5) DEFAULT NULL,
    religion VARCHAR(50) DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_personal_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT fk_personal_nationality FOREIGN KEY (nationality_code) REFERENCES public.reference_data (code) ON DELETE RESTRICT,
    CONSTRAINT chk_personal_gender CHECK (gender IN ('male', 'female', 'other')),
    CONSTRAINT chk_personal_dob CHECK (date_of_birth < CURRENT_DATE),
    CONSTRAINT chk_personal_full_name_not_empty CHECK (length(trim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS student_personal_nationality_idx ON public.student_personal (nationality_code) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.student_personal IS 'Personal and biographical metadata for international students.';
COMMENT ON COLUMN public.student_personal.student_id IS 'Primary key referencing students(id) on cascade delete.';
COMMENT ON COLUMN public.student_personal.full_name IS 'Legal name matching passport spellings.';
COMMENT ON COLUMN public.student_personal.nationality_code IS 'Reference lookup for ISO country code.';
COMMENT ON COLUMN public.student_personal.gender IS 'Gender option (male, female, other).';
COMMENT ON COLUMN public.student_personal.date_of_birth IS 'Biographical date of birth.';


-- 2. Student Contact Table
CREATE TABLE IF NOT EXISTS public.student_contact (
    student_id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone_home VARCHAR(20) NOT NULL,
    phone_local VARCHAR(20) DEFAULT NULL,
    permanent_address TEXT NOT NULL,
    local_address TEXT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_contact_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT unique_contact_email UNIQUE (email),
    CONSTRAINT chk_contact_email_regex CHECK (email ~* '^.+@.+\..+$'),
    CONSTRAINT chk_contact_phone_home_not_empty CHECK (length(trim(phone_home)) > 0),
    CONSTRAINT chk_contact_perm_address_not_empty CHECK (length(trim(permanent_address)) > 0)
);

COMMENT ON TABLE public.student_contact IS 'Contact coordinates and local/permanent addresses.';
COMMENT ON COLUMN public.student_contact.student_id IS 'Primary key referencing students(id) on cascade delete.';
COMMENT ON COLUMN public.student_contact.email IS 'Unique, regex-validated email address.';
COMMENT ON COLUMN public.student_contact.phone_home IS 'Home phone number (including country code).';
COMMENT ON COLUMN public.student_contact.phone_local IS 'Host/local phone number (including country code).';


-- 3. Student Academic Table
CREATE TABLE IF NOT EXISTS public.student_academic (
    student_id UUID PRIMARY KEY,
    program_code VARCHAR(20) NOT NULL,
    admission_date DATE NOT NULL,
    expected_graduation DATE NOT NULL,
    current_semester INT NOT NULL DEFAULT 1,
    academic_status VARCHAR(20) NOT NULL DEFAULT 'good_standing',
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_academic_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_program FOREIGN KEY (program_code) REFERENCES public.reference_data (code) ON DELETE RESTRICT,
    CONSTRAINT chk_academic_graduation_after_admission CHECK (expected_graduation > admission_date),
    CONSTRAINT chk_academic_semester CHECK (current_semester > 0 AND current_semester < 20),
    CONSTRAINT chk_academic_status CHECK (academic_status IN ('good_standing', 'probation', 'suspended'))
);

CREATE INDEX IF NOT EXISTS student_academic_program_idx ON public.student_academic (program_code) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.student_academic IS 'Academic enrollment tracks and institutional standings.';
COMMENT ON COLUMN public.student_academic.student_id IS 'Primary key referencing students(id) on cascade delete.';
COMMENT ON COLUMN public.student_academic.program_code IS 'Reference lookup for academic programs code.';


-- 4. Student Relationships Table (Emergency Contacts/Sponsors)
CREATE TABLE IF NOT EXISTS public.student_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    relationship_type VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT DEFAULT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_relationships_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT chk_relationships_type CHECK (relationship_type IN ('parent', 'guardian', 'local_sponsor')),
    CONSTRAINT chk_relationships_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_relationships_phone_not_empty CHECK (length(trim(phone)) > 0)
);

CREATE INDEX IF NOT EXISTS student_relationships_student_idx ON public.student_relationships (student_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.student_relationships IS 'Emergency contacts, guardians, and local sponsor coordination.';


-- 5. Student Embassy Table
CREATE TABLE IF NOT EXISTS public.student_embassy (
    student_id UUID PRIMARY KEY,
    embassy_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    address TEXT NOT NULL,
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL,

    -- Constraints & Foreign Keys
    CONSTRAINT fk_embassy_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT chk_embassy_name_not_empty CHECK (length(trim(embassy_name)) > 0),
    CONSTRAINT chk_embassy_address_not_empty CHECK (length(trim(address)) > 0)
);

COMMENT ON TABLE public.student_embassy IS 'Embassy coordination details for repatriation or emergency protocols.';

COMMIT;

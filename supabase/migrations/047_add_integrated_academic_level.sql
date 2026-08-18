-- Migration: 047_add_integrated_academic_level
-- Description: Extends canonical reference data with academic_level category,
--              seeds canonical academic levels including Integrated (UG + PG),
--              and configures documentation comments.
-- Dependencies: 002_reference_data.sql, 025_academic_programs.sql, 030_sync_reference_data_and_constraints.sql
-- Transaction: Yes

BEGIN;

-- 1. Ensure reference_data category constraint accommodates academic_level
ALTER TABLE public.reference_data DROP CONSTRAINT IF EXISTS check_valid_category;
ALTER TABLE public.reference_data ADD CONSTRAINT check_valid_category CHECK (category IN (
    'sponsorship_category',
    'visa_type',
    'gender',
    'marital_status',
    'blood_group',
    'school',
    'course',
    'program',
    'fee_type',
    'document_status',
    'notification_channel',
    'notification_status',
    'country',
    'academic_level'
));

-- 2. Populate canonical academic level entries into reference_data
INSERT INTO public.reference_data (category, code, display_name, description, display_order, is_active)
VALUES
    ('academic_level', 'UNDERGRADUATE', 'Undergraduate (UG)', 'Undergraduate bachelor degree program', 1, true),
    ('academic_level', 'POSTGRADUATE', 'Postgraduate (PG)', 'Postgraduate master degree program', 2, true),
    ('academic_level', 'DOCTORATE', 'Doctorate (PhD)', 'Doctor of Philosophy doctoral research program', 3, true),
    ('academic_level', 'DIPLOMA_CERTIFICATE', 'Diploma / Cert', 'Diploma or professional certificate program', 4, true),
    ('academic_level', 'INTEGRATED', 'Integrated (UG + PG)', 'Integrated continuous undergraduate and postgraduate combined program', 5, true)
ON CONFLICT (code) DO UPDATE SET
    category = EXCLUDED.category,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 3. Document academic_level in academic_programs table
COMMENT ON COLUMN public.academic_programs.academic_level IS 'Canonical academic level: UNDERGRADUATE, POSTGRADUATE, DOCTORATE, DIPLOMA_CERTIFICATE, INTEGRATED (or short codes UG, PG, PhD, Diploma).';

COMMIT;

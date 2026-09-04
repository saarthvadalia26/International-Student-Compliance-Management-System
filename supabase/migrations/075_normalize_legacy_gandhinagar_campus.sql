-- Migration: 075_normalize_legacy_gandhinagar_campus.sql
-- Description: Safely migrate and normalize legacy Gandhinagar campus values to canonical
--              'Gandhinagar Headquarter' across public.student_academic and clean up
--              duplicate master-data entries in public.campuses.
-- Dependencies: 072_profile_bank_scholarship_campus_expansion.sql
-- Transaction: Yes

BEGIN;

-- 1. Normalize all legacy Gandhinagar variants in student_academic to canonical 'Gandhinagar Headquarter'
-- Case-insensitive match trimming any leading or trailing whitespace.
UPDATE public.student_academic
SET nfsu_campus = 'Gandhinagar Headquarter',
    updated_at = NOW()
WHERE TRIM(LOWER(nfsu_campus)) = 'gandhinagar';

-- 2. Remove redundant duplicate campus master-data rows created by migration 072 auto-sync
-- Ensures Settings -> NFSU Campuses only contains the canonical 'Gandhinagar Headquarter'.
DELETE FROM public.campuses
WHERE TRIM(LOWER(name)) = 'gandhinagar';

COMMIT;

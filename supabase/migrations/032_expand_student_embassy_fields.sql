-- Migration: 032_expand_student_embassy_fields
-- Description: Adds city, country, and website columns to student_embassy table for comprehensive diplomatic mission tracking.
-- Dependencies: 004_student_details.sql
-- Transaction: Yes

BEGIN;

ALTER TABLE public.student_embassy 
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN public.student_embassy.city IS 'City of the diplomatic mission or consulate.';
COMMENT ON COLUMN public.student_embassy.country IS 'Country jurisdiction for the consular mission.';
COMMENT ON COLUMN public.student_embassy.website IS 'Official website URL for consular services.';

COMMIT;

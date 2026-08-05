-- Migration 026: Add Program Duration to Academic Program Master Table
-- Institution: National Forensic Sciences University (NFSU)
-- Date: August 5, 2026

ALTER TABLE public.academic_programs 
  ADD COLUMN IF NOT EXISTS duration_value INTEGER NOT NULL DEFAULT 4 CHECK (duration_value > 0),
  ADD COLUMN IF NOT EXISTS duration_unit TEXT NOT NULL DEFAULT 'Years' 
    CHECK (duration_unit IN ('Years', 'Semesters', 'Trimesters', 'Months', 'Credits', 'Research_Months'));

-- Backfill existing records based on degree program naming patterns
UPDATE public.academic_programs
SET 
  duration_value = CASE 
    WHEN program_name ILIKE '%M.Tech%' OR program_name ILIKE '%M.Sc%' OR program_name ILIKE '%MBA%' OR program_name ILIKE '%Master%' THEN 2
    WHEN program_name ILIKE '%Ph.D%' OR program_name ILIKE '%Doctor%' OR program_code ILIKE '%PHD%' THEN 6
    WHEN program_name ILIKE '%Integrated%' THEN 5
    ELSE 4
  END,
  duration_unit = 'Years'
WHERE duration_value IS NULL OR duration_unit IS NULL;

-- Index for display ordering and duration queries
CREATE INDEX IF NOT EXISTS idx_academic_programs_duration 
  ON public.academic_programs(duration_value, duration_unit);

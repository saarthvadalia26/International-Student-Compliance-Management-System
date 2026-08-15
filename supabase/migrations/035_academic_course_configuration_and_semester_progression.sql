-- Migration: 035_academic_course_configuration_and_semester_progression
-- Description: Extends academic_programs with semester duration/count configurations,
-- creates student_academic_adjustments table for controlled, auditable overrides,
-- and configures RLS and indexes.
-- Transaction: Yes.

BEGIN;

-- 1. Extend academic_programs with semester structure configuration
ALTER TABLE public.academic_programs 
  ADD COLUMN IF NOT EXISTS total_semesters INTEGER NOT NULL DEFAULT 8 
    CHECK (total_semesters > 0 AND total_semesters <= 20),
  ADD COLUMN IF NOT EXISTS semester_duration INTEGER NOT NULL DEFAULT 6 
    CHECK (semester_duration > 0 AND semester_duration <= 365),
  ADD COLUMN IF NOT EXISTS semester_duration_unit TEXT NOT NULL DEFAULT 'months' 
    CHECK (semester_duration_unit IN ('months', 'weeks', 'days'));

-- Backfill existing academic program records based on program level and degree patterns
UPDATE public.academic_programs
SET 
  total_semesters = CASE 
    WHEN program_name ILIKE '%M.Tech%' OR program_name ILIKE '%M.Sc%' OR program_name ILIKE '%MBA%' OR program_name ILIKE '%Master%' THEN 4
    WHEN program_name ILIKE '%B.Sc%' THEN 6
    WHEN program_name ILIKE '%Ph.D%' OR program_name ILIKE '%Doctor%' OR program_code ILIKE '%PHD%' THEN 6
    WHEN program_name ILIKE '%Integrated%' THEN 10
    ELSE 8
  END,
  semester_duration = 6,
  semester_duration_unit = 'months'
WHERE total_semesters IS NULL OR semester_duration IS NULL OR semester_duration_unit IS NULL;

-- 2. Create student_academic_adjustments table for auditable exceptions and overrides
CREATE TABLE IF NOT EXISTS public.student_academic_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    previous_program_code VARCHAR(50),
    new_program_code VARCHAR(50),
    previous_semester INTEGER,
    adjusted_semester INTEGER,
    reason TEXT NOT NULL,
    notes TEXT,
    created_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints & Foreign Keys
    CONSTRAINT fk_adjustment_student FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
    CONSTRAINT chk_adjustment_type CHECK (
      adjustment_type IN (
        'semester_override', 
        'semester_repeat', 
        'academic_leave', 
        'course_transfer', 
        'extension', 
        'admission_date_correction'
      )
    ),
    CONSTRAINT chk_adjusted_semester CHECK (adjusted_semester IS NULL OR (adjusted_semester > 0 AND adjusted_semester <= 20)),
    CONSTRAINT chk_previous_semester CHECK (previous_semester IS NULL OR (previous_semester > 0 AND previous_semester <= 20))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_academic_adjustments_student 
  ON public.student_academic_adjustments (student_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_academic_adjustments_created 
  ON public.student_academic_adjustments (created_at DESC);

-- Enable RLS
ALTER TABLE public.student_academic_adjustments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SELECT_student_academic_adjustments_StaffAdmin" ON public.student_academic_adjustments;
DROP POLICY IF EXISTS "INSERT_student_academic_adjustments_StaffAdmin" ON public.student_academic_adjustments;

-- RLS Policies
CREATE POLICY "SELECT_student_academic_adjustments_StaffAdmin" 
  ON public.student_academic_adjustments 
  FOR SELECT 
  USING (true);

CREATE POLICY "INSERT_student_academic_adjustments_StaffAdmin" 
  ON public.student_academic_adjustments 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE public.student_academic_adjustments IS 'Auditable historical log of academic adjustments, semester overrides, and course transfers.';
COMMENT ON COLUMN public.student_academic_adjustments.reason IS 'Mandatory institutional reason for academic progression adjustment.';

COMMIT;

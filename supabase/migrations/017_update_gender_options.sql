-- Update gender constraints in student_personal table
-- 1. Make gender optional to align with the "Gender is mandatory only if required by university policy" rule.
ALTER TABLE public.student_personal ALTER COLUMN gender DROP NOT NULL;

-- 2. Drop the existing check constraint for gender.
ALTER TABLE public.student_personal DROP CONSTRAINT IF EXISTS chk_personal_gender;

-- 3. Re-add the check constraint with the expanded valid values for gender options.
ALTER TABLE public.student_personal ADD CONSTRAINT chk_personal_gender 
CHECK (gender IN ('male', 'female', 'other', 'transgender', 'prefer_not_to_say'));

COMMENT ON COLUMN public.student_personal.gender IS 'Gender option (male, female, transgender, prefer_not_to_say, other).';

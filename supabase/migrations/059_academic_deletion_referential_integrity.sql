-- Migration: 059_academic_deletion_referential_integrity
-- Description: Enforces referential integrity constraints on academic programs and schools
--              to ensure foreign keys use ON DELETE RESTRICT rather than allowing accidental cascades
--              or silent unlinking when dependent student records exist.
-- Dependencies: 025_academic_programs.sql, 050_academic_program_integrity.sql, 056_canonical_schools_and_departments.sql
-- Transaction: Yes

BEGIN;

-- 1. Ensure foreign key constraint on student_academic(program_id) references public.academic_programs(id) with ON DELETE RESTRICT
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.student_academic'::regclass
          AND contype = 'f'
          AND confrelid = 'public.academic_programs'::regclass
    ) LOOP
        EXECUTE format('ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS %I;', constraint_rec.conname);
    END LOOP;
END $$;

ALTER TABLE public.student_academic
    ADD CONSTRAINT fk_student_academic_program_id
    FOREIGN KEY (program_id) REFERENCES public.academic_programs (id)
    ON DELETE RESTRICT;

-- 2. Ensure foreign key constraint on student_academic(override_school_id) references public.schools(id) with ON DELETE RESTRICT
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.student_academic'::regclass
          AND contype = 'f'
          AND confrelid = 'public.schools'::regclass
    ) LOOP
        EXECUTE format('ALTER TABLE public.student_academic DROP CONSTRAINT IF EXISTS %I;', constraint_rec.conname);
    END LOOP;
END $$;

ALTER TABLE public.student_academic
    ADD CONSTRAINT fk_student_academic_override_school_id
    FOREIGN KEY (override_school_id) REFERENCES public.schools (id)
    ON DELETE RESTRICT;

-- 3. Confirm academic_programs(school_id) references public.schools(id) with ON DELETE RESTRICT
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.academic_programs'::regclass
          AND contype = 'f'
          AND confrelid = 'public.schools'::regclass
    ) LOOP
        EXECUTE format('ALTER TABLE public.academic_programs DROP CONSTRAINT IF EXISTS %I;', constraint_rec.conname);
    END LOOP;
END $$;

ALTER TABLE public.academic_programs
    ADD CONSTRAINT fk_academic_programs_school_id
    FOREIGN KEY (school_id) REFERENCES public.schools (id)
    ON DELETE RESTRICT;

-- 4. Verify RLS Delete policies for administrator role
DROP POLICY IF EXISTS "DELETE_academic_programs_Admin" ON public.academic_programs;
CREATE POLICY "DELETE_academic_programs_Admin" ON public.academic_programs 
    FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "DELETE_schools_Admin" ON public.schools;
CREATE POLICY "DELETE_schools_Admin" ON public.schools 
    FOR DELETE USING (public.is_admin());

COMMIT;

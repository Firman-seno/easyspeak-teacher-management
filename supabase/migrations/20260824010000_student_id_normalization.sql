-- Student ID uniqueness that ignores letter case and surrounding spaces.
-- The original UNIQUE constraint on students.student_id stays untouched.

-- 1) Trim Student ID automatically on every write, so " Stu-012 " and
--    "Stu-012" can never become two different students.
CREATE OR REPLACE FUNCTION public.normalize_student_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.student_id := btrim(NEW.student_id, E' \t\n\r');
  RETURN NEW;
END $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS students_normalize_id ON public.students;
CREATE TRIGGER students_normalize_id BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.normalize_student_id();

-- 2) Case-insensitive uniqueness: Stu-012 / STU-012 / stu-012 are the same ID.
--    Existing IDs are never modified. If legacy rows collide when case/spacing
--    is ignored, this migration fails instead of silently removing the DB
--    guarantee; resolve those conflicting rows before retrying the migration.
CREATE UNIQUE INDEX IF NOT EXISTS students_student_id_ci_unique
  ON public.students (lower(btrim(student_id)));

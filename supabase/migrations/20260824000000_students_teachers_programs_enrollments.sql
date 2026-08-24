-- Additive migration: programs / teachers / enrollments + student parent info.
-- Safe to re-run: every step is guarded. No existing data is modified or removed.

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------------------------
-- programs catalog (human-readable program names become real rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  allowed_levels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "programs_all" ON public.programs;
CREATE POLICY "programs_all" ON public.programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.programs (name, allowed_levels) VALUES
  ('General English',   ARRAY['Pre-A1','A1','A2','B1','B2','C1','C2']),
  ('Conversation Class',ARRAY['A1','A2','B1','B2','C1','C2']),
  ('Business English',  ARRAY['A1','A2','B1','B2','C1','C2']),
  ('IELTS Preparation', ARRAY['Foundation','IELTS Preparation','IELTS Intermediate','IELTS Advanced']),
  ('Kids English',      ARRAY['Pre-A1','A1','A2','B1'])
ON CONFLICT (name) DO NOTHING;

-- Any legacy/custom program names that exist on students get a row too,
-- so backfill below never loses a student.
INSERT INTO public.programs (name, allowed_levels)
SELECT DISTINCT s.program, ARRAY['Pre-A1','A1','A2','B1','B2','C1','C2']::text[]
FROM public.students s
WHERE s.program IS NOT NULL AND btrim(s.program) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.name = s.program);

-- ---------------------------------------------------------------------------
-- teachers (real entities; user_id links a row to the logged-in auth user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS teachers_name_unique ON public.teachers (lower(btrim(name)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teachers_all" ON public.teachers;
CREATE POLICY "teachers_all" ON public.teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed one teacher row per distinct teacher name already used on students.
INSERT INTO public.teachers (name)
SELECT DISTINCT btrim(t.teacher)
FROM public.students t
WHERE t.teacher IS NOT NULL AND btrim(t.teacher) <> ''
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- students: parent/guardian columns + teacher_id relationship.
-- The legacy `teacher` text column stays in sync via trigger so existing
-- pages (reports, lesson detail) keep working unchanged.
-- ---------------------------------------------------------------------------
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_relationship text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email text;

UPDATE public.students s
SET teacher_id = t.id
FROM public.teachers t
WHERE s.teacher_id IS NULL
  AND s.teacher IS NOT NULL
  AND lower(btrim(t.name)) = lower(btrim(s.teacher));

CREATE OR REPLACE FUNCTION public.sync_student_teacher() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.teacher_id IS NOT NULL THEN
    SELECT name INTO NEW.teacher FROM public.teachers WHERE id = NEW.teacher_id;
  ELSIF NEW.teacher IS NOT NULL AND btrim(NEW.teacher) <> '' THEN
    SELECT id INTO NEW.teacher_id FROM public.teachers WHERE lower(btrim(name)) = lower(btrim(NEW.teacher));
  ELSE
    NEW.teacher_id = NULL;
    NEW.teacher = NULL;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS students_sync_teacher ON public.students;
CREATE TRIGGER students_sync_teacher BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.sync_student_teacher();

-- ---------------------------------------------------------------------------
-- enrollments: a student can take many programs; duplicates are blocked by DB
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id),
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  enrollment_date date NOT NULL DEFAULT now(),
  current_level text NOT NULL,
  target_level text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_all" ON public.enrollments;
CREATE POLICY "enrollments_all" ON public.enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER enrollments_updated BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Duplicate enrollment guard (student + program + teacher). COALESCE makes
-- NULL teacher participate in the uniqueness check.
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_unique_student_program_teacher
  ON public.enrollments (student_id, program_id, COALESCE(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Backfill: one enrollment per existing student for their current program.
INSERT INTO public.enrollments (student_id, program_id, teacher_id, enrollment_date, current_level, target_level, status)
SELECT s.id, p.id, s.teacher_id,
       COALESCE(s.enrollment_date, now()::date),
       s.current_level, s.target_level,
       CASE WHEN s.status IN ('Active', 'Inactive', 'Completed', 'Suspended') THEN s.status ELSE 'Active' END
FROM public.students s
JOIN public.programs p ON p.name = s.program
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments e
  WHERE e.student_id = s.id
    AND e.program_id = p.id
    AND COALESCE(e.teacher_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(s.teacher_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- NOTE: `students.student_id` keeps its UNIQUE constraint
-- (students_student_id_key). The application layer translates the raw
-- duplicate-key error (23505) into a friendly message; the constraint stays
-- in place as the race-condition safety net.

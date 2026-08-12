-- Adds lessons.student_id so lessons can be linked to a student.
-- The column is NULLABLE on purpose: existing seed lessons have no
-- assigned student and must be preserved. It references the PRIMARY KEY
-- of students (students.id, uuid) — NOT the display value students.student_id.
-- Idempotent: safe to re-run.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON public.lessons(student_id);

-- Force PostgREST to reload its schema cache so the API immediately
-- recognizes the new column.
NOTIFY pgrst, 'reload schema';

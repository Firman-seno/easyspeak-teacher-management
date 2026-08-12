-- Safe, non-destructive schema alignment with the current frontend.
-- Rule: never rename or drop columns, never delete existing rows.
-- All statements are idempotent so they can be re-run safely.

-- 1) lessons: turn into a per-student teacher-managed CMS.
--    student_id stays nullable so existing unassigned seed lessons are preserved.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Planned',
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON public.lessons(student_id);
DROP TRIGGER IF EXISTS lessons_updated ON public.lessons;
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) projects: add the fields the Projects feature needs.
--    Existing columns assigned_date and feedback are KEPT (no rename).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS submission_date date,
  ADD COLUMN IF NOT EXISTS teacher_notes text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS submission_link text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Align legacy status value with the Projects feature statuses.
UPDATE public.projects SET status = 'Planned' WHERE status = 'Assigned';

CREATE INDEX IF NOT EXISTS projects_student_id_idx ON public.projects(student_id);
DROP TRIGGER IF EXISTS projects_updated ON public.projects;
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) assignments: the table does not exist yet, so create it.
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Homework',
  description text,
  instructions text,
  assigned_date date NOT NULL DEFAULT now(),
  due_date date,
  status text NOT NULL DEFAULT 'Assigned',
  score int CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  max_score int CHECK (max_score IS NULL OR max_score > 0),
  teacher_notes text,
  attachment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_all" ON public.assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS assignments_student_id_idx ON public.assignments(student_id);
DROP TRIGGER IF EXISTS assignments_updated ON public.assignments;
CREATE TRIGGER assignments_updated BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) monthly_reports: add granular lesson/assignment/project counters and teacher evaluation fields.
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS strengths text,
  ADD COLUMN IF NOT EXISTS areas_to_improve text,
  ADD COLUMN IF NOT EXISTS next_month_goals text,
  ADD COLUMN IF NOT EXISTS lessons_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_planned int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lessons_completed_percent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_completed int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_submitted int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_overdue int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_avg_score int,
  ADD COLUMN IF NOT EXISTS assignments_completion_percent int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_in_progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_submitted int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_overdue int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_avg_score int,
  ADD COLUMN IF NOT EXISTS projects_completion_percent int NOT NULL DEFAULT 0;

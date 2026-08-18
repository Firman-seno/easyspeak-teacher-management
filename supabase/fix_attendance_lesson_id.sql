-- ============================================================
-- FIX: Add lesson_id to attendance + all missing schema columns
-- ============================================================
-- SAFE TO RUN: All statements use IF NOT EXISTS / IF EXISTS
--   so they won't break existing data or duplicate changes.
--
-- HOW TO RUN:
--   1) Open Supabase Dashboard → SQL Editor → New Query
--   2) Paste ALL of this file → Click "Run"
--   3) Wait for "Success" message
-- ============================================================

-- 1) Add lesson_id column to attendance (nullable, safe for existing rows)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS lesson_id uuid;

-- 2) Add foreign key to lessons (cascade delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_lesson_id_fkey'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Create partial unique index: at most one attendance per lesson
CREATE UNIQUE INDEX IF NOT EXISTS attendance_lesson_id_unique
  ON public.attendance (lesson_id) WHERE lesson_id IS NOT NULL;

-- 4) Drop old unique constraint on (student_id, date) if it exists
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- 5) Add missing columns to lessons table
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS success_indicator text,
  ADD COLUMN IF NOT EXISTS speaking_score int,
  ADD COLUMN IF NOT EXISTS listening_score int,
  ADD COLUMN IF NOT EXISTS reading_score int,
  ADD COLUMN IF NOT EXISTS writing_score int,
  ADD COLUMN IF NOT EXISTS vocabulary_score int;

-- 6) Add missing columns to lessons (status, content, etc.) if not yet present
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Planned',
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 7) Lessons CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_duration_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_duration_check
      CHECK (duration IS NULL OR duration > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_speaking_score_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_speaking_score_check
      CHECK (speaking_score IS NULL OR (speaking_score >= 0 AND speaking_score <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_listening_score_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_listening_score_check
      CHECK (listening_score IS NULL OR (listening_score >= 0 AND listening_score <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_reading_score_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_reading_score_check
      CHECK (reading_score IS NULL OR (reading_score >= 0 AND reading_score <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_writing_score_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_writing_score_check
      CHECK (writing_score IS NULL OR (writing_score >= 0 AND writing_score <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_vocabulary_score_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_vocabulary_score_check
      CHECK (vocabulary_score IS NULL OR (vocabulary_score >= 0 AND vocabulary_score <= 100));
  END IF;
END $$;

-- 8) Add missing columns to monthly_reports
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS monthly_assessment jsonb,
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

-- 9) monthly_reports date range constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monthly_reports_date_range_check'
  ) THEN
    ALTER TABLE public.monthly_reports
      ADD CONSTRAINT monthly_reports_date_range_check
      CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

-- 10) Add missing columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS progress int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submission_date date,
  ADD COLUMN IF NOT EXISTS teacher_notes text,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS submission_link text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 11) Create indexes
CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON public.lessons(student_id);
CREATE INDEX IF NOT EXISTS projects_student_id_idx ON public.projects(student_id);

-- 12) Make sure triggers exist
DROP TRIGGER IF EXISTS lessons_updated ON public.lessons;
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS projects_updated ON public.projects;
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CRITICAL: Force PostgREST to reload its schema cache
-- This is what makes the API "see" the new columns.
-- ============================================================
NOTIFY pgrst, 'reload schema';

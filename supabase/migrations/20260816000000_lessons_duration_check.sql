-- ============================================================
-- Lesson duration safety constraint
-- ------------------------------------------------------------
-- The lessons.duration int column already exists (nullable and
-- stores minutes). This migration only adds a CHECK constraint so
-- a lesson duration can never be negative or zero, while NULL
-- stays allowed for older lessons that have no duration set.
-- Idempotent: safe to re-run.
-- ============================================================
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_duration_check;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_duration_check
  CHECK (duration IS NULL OR duration > 0);

-- Force PostgREST to reload its schema cache so the API immediately
-- recognizes the new constraint.
NOTIFY pgrst, 'reload schema';

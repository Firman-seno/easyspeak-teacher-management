-- Migration: Link attendance records to lessons
-- Each lesson can have at most one attendance record.
-- Attendance is now created/managed from the Lessons/Materials flow.
-- Old attendance records (without lesson_id) are preserved for backward compatibility.

-- 1. Add lesson_id column (nullable for existing records)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lesson_id uuid;

-- 2. Add foreign key to lessons
ALTER TABLE attendance
  ADD CONSTRAINT attendance_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

-- 3. Create UNIQUE CONSTRAINT on lesson_id (required for Supabase ON CONFLICT upsert).
--    PostgreSQL allows multiple NULLs in a UNIQUE column, so old attendance
--    records without lesson_id are preserved.
ALTER TABLE attendance
  ADD CONSTRAINT attendance_lesson_id_key UNIQUE (lesson_id);

-- 4. Remove the old unique constraint on (student_id, date) to allow
--    the same student to have multiple lessons (and attendance) on the same date.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- 5. Force PostgREST to reload its schema cache so the API sees the new column.
NOTIFY pgrst, 'reload schema';

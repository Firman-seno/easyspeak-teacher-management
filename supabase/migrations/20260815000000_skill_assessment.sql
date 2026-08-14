-- ============================================================
-- Skill Assessment for Lessons / Materials
-- Adds a 5-skill assessment to every lesson. All score columns
-- are NULLABLE on purpose: NULL means "Not Assessed", never 0.
-- No grammar_score is created.
-- Also adds a JSONB column on monthly_reports to store the manual
-- monthly totals / final scores / percentages per skill.
-- Idempotent: safe to re-run.
-- ============================================================
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS speaking_score int
    CHECK (speaking_score IS NULL OR (speaking_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS listening_score int
    CHECK (listening_score IS NULL OR (listening_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS reading_score int
    CHECK (reading_score IS NULL OR (reading_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS writing_score int
    CHECK (writing_score IS NULL OR (writing_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS vocabulary_score int
    CHECK (vocabulary_score IS NULL OR (vocabulary_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS assessment_notes text;

-- Manual monthly assessment data (Skill Analysis editor):
-- {
--   speaking:   { total, final_score, percentage },
--   listening:  { total, final_score, percentage },
--   reading:    { total, final_score, percentage },
--   writing:    { total, final_score, percentage },
--   vocabulary: { total, final_score, percentage },
--   overall:    { monthly_score, percentage }
-- }
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS monthly_assessment jsonb;

-- Force PostgREST to reload its schema cache so the API immediately
-- recognizes the new columns.
NOTIFY pgrst, 'reload schema';

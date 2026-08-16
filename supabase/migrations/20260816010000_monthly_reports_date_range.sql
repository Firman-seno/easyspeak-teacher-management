-- ============================================================
-- Monthly reports: date-range period
-- ------------------------------------------------------------
-- Adds start_date / end_date (Postgres `date`, date-only) so a
-- report period no longer has to be a full calendar month.
-- month / year are KEPT for legacy reports (never deleted) and
-- are still populated for new reports from the start date.
--
-- Existing reports are backfilled to their calendar month so they
-- keep working and display a proper date range.
-- Idempotent: safe to re-run.
-- ============================================================
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Backfill legacy reports to their calendar month boundaries.
UPDATE public.monthly_reports
SET
  start_date = make_date(year, month, 1),
  end_date = (make_date(year, month, 1) + interval '1 month - 1 day')::date
WHERE start_date IS NULL
  AND end_date IS NULL
  AND year IS NOT NULL
  AND month IS NOT NULL;

-- Safety: a report range must never be inverted. NULLs are allowed
-- so legacy rows (or reports still being prepared) can pass through.
ALTER TABLE public.monthly_reports
  DROP CONSTRAINT IF EXISTS monthly_reports_date_range_check;
ALTER TABLE public.monthly_reports
  ADD CONSTRAINT monthly_reports_date_range_check
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- Force PostgREST to reload its schema cache so the API immediately
-- recognizes the new columns.
NOTIFY pgrst, 'reload schema';

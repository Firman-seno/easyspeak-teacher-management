-- ============================================================
-- Monthly reports: date-range period
-- ------------------------------------------------------------
-- Adds start_date / end_date (Postgres `date`, date-only) so a
-- report period no longer has to be a full calendar month.
-- month / year are kept for legacy reports and are not deleted.
-- New reports should prefer start_date / end_date as the primary
-- period while remaining backward-compatible with older rows.
-- Idempotent: safe to re-run.
-- ============================================================
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Keep legacy month/year rows readable even if they are still null.
ALTER TABLE public.monthly_reports
  ALTER COLUMN month DROP NOT NULL,
  ALTER COLUMN year DROP NOT NULL;

-- Backfill any legacy report that has month/year but not a date range.
UPDATE public.monthly_reports
SET
  start_date = COALESCE(start_date, make_date(year, month, 1)),
  end_date = COALESCE(end_date, (make_date(year, month, 1) + interval '1 month - 1 day')::date)
WHERE (start_date IS NULL OR end_date IS NULL)
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

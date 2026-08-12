-- ============================================================
-- Materials: add Subtitle and Success Indicator (both optional text)
-- Adds columns only if missing. No table drop/recreate, no data loss.
-- ============================================================
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS success_indicator text;

-- ============================================================
-- Teacher profile avatars: public storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Read: anyone may view avatar images (bucket is public for URL display).
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Write: authenticated users may only manage files inside their own
-- folder `avatars/{their-user-id}/...`, so no one can overwrite another
-- teacher's photo.
DROP POLICY IF EXISTS "avatars_own_insert" ON storage.objects;
CREATE POLICY "avatars_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
CREATE POLICY "avatars_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_own_delete" ON storage.objects;
CREATE POLICY "avatars_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Tell PostgREST to reload its schema cache so the API
-- immediately recognizes the new columns.
-- ============================================================
NOTIFY pgrst, 'reload schema';

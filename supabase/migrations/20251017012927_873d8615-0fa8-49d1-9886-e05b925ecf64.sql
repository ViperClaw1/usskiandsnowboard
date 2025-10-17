-- Ensure public bucket for athlete lifestyle photos and proper access policies
-- 1) Create or update the bucket to be public
insert into storage.buckets (id, name, public)
values ('athlete-photos', 'athlete-photos', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

-- 2) Public read access to files in this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Athlete photos are publicly accessible'
  ) THEN
    CREATE POLICY "Athlete photos are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'athlete-photos');
  END IF;
END $$;

-- 3) Allow users to upload files within their own folder (first path segment = auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own athlete photos'
  ) THEN
    CREATE POLICY "Users can upload their own athlete photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'athlete-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- 4) Allow users to update files within their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own athlete photos'
  ) THEN
    CREATE POLICY "Users can update their own athlete photos"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'athlete-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- 5) Allow users to delete files within their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own athlete photos'
  ) THEN
    CREATE POLICY "Users can delete their own athlete photos"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'athlete-photos'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
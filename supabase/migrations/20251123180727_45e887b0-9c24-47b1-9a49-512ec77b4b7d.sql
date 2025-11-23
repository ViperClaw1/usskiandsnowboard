-- Fix RLS policies for company-logos bucket - the upload code already uses correct path format

-- Drop existing policies
DROP POLICY IF EXISTS "Employers can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Employers can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Employers can delete their own logo" ON storage.objects;

-- Allow authenticated users to upload logos to their own folder
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view company logos (public bucket)
CREATE POLICY "Allow public to view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow authenticated users to update their own logos
CREATE POLICY "Allow users to update own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Allow users to delete own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
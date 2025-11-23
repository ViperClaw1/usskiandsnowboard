-- Fix RLS policies for company-logos bucket to allow employers to upload their own logos

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employers can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Employers can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Employers can delete their own logo" ON storage.objects;

-- Allow employers to upload their company logos
CREATE POLICY "Employers can upload their own logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view company logos (bucket is public)
CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow employers to update their own logos
CREATE POLICY "Employers can update their own logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow employers to delete their own logos
CREATE POLICY "Employers can delete their own logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
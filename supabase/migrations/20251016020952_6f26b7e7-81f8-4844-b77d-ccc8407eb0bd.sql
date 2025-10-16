-- Create storage bucket for athlete photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-photos', 'athlete-photos', true);

-- Create RLS policies for athlete photos
CREATE POLICY "Athletes can upload their own photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'athlete-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Athletes can update their own photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'athlete-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Athletes can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'athlete-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view athlete photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'athlete-photos');
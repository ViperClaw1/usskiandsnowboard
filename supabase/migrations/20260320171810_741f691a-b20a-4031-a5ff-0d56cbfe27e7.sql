-- Create athlete-assets bucket for background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-assets', 'athlete-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for athlete-assets bucket
CREATE POLICY "Athletes can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'athlete-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Athletes can update their own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'athlete-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Athletes can delete their own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'athlete-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view athlete assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'athlete-assets');
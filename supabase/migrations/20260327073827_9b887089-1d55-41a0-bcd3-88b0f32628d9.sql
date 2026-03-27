INSERT INTO storage.buckets (id, name, public)
VALUES ('expert-photos', 'expert-photos', true);

CREATE POLICY "Users can upload expert photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expert-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update expert photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expert-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete expert photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expert-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view expert photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'expert-photos');

CREATE POLICY "Admins can upload athlete photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'athlete-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update athlete photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'athlete-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete athlete photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'athlete-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload expert photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expert-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update expert photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expert-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete expert photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expert-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

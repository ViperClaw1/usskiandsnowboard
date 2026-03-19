CREATE POLICY "Public can view public athlete profiles"
ON public.athlete_profiles
FOR SELECT
TO public
USING (is_public = true);
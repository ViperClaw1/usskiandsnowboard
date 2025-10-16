-- Allow employers to read names for public athlete profiles
CREATE POLICY "Employers can view names for public athletes"
ON profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'employer'::app_role)
  AND EXISTS (
    SELECT 1 FROM athlete_profiles ap
    WHERE ap.user_id = profiles.id AND ap.is_public = true
  )
);
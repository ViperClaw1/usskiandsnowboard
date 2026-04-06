-- Allow public (unauthenticated) users to view public athlete profiles
CREATE POLICY "Public can view public athlete profiles"
ON public.athlete_profiles
FOR SELECT
USING (is_public = true);

-- Allow public (unauthenticated) users to view all employer profiles
CREATE POLICY "Public can view all employer profiles"
ON public.employer_profiles
FOR SELECT
USING (true);

-- Allow public users to view profile names for public athletes
CREATE POLICY "Public can view names for public athletes"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM athlete_profiles ap
    WHERE ap.user_id = profiles.id
    AND ap.is_public = true
  )
);
-- Add permissive policy for authenticated users to view public athlete profiles
-- This allows logged-in users (regardless of role) to browse public athletes
CREATE POLICY "Authenticated users can view public athlete profiles"
ON athlete_profiles
FOR SELECT
TO authenticated
USING (is_public = true);

-- Same for the profiles table join
CREATE POLICY "Authenticated users can view names for public athletes"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM athlete_profiles ap
    WHERE ap.user_id = profiles.id 
    AND ap.is_public = true
  )
);
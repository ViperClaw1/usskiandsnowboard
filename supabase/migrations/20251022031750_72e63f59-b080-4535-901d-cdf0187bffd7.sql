-- Fix PUBLIC_DATA_EXPOSURE: Restrict public access to athlete profiles
-- Remove overly permissive public policy
DROP POLICY IF EXISTS "Public can view public athlete profiles" ON athlete_profiles;

-- Require authentication for all athlete profile viewing
-- This prevents mass scraping of contact information
CREATE POLICY "Authenticated users can view basic athlete profiles"
  ON athlete_profiles FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);
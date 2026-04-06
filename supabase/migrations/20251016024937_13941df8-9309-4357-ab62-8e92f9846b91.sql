-- Allow athletes to view employer profiles
CREATE POLICY "Athletes can view employer profiles"
ON employer_profiles
FOR SELECT
USING (has_role(auth.uid(), 'athlete'::app_role));
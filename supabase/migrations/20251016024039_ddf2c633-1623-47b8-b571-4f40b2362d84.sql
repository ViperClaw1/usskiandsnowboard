-- Add policy for employers to create connection requests to athletes
CREATE POLICY "Employers can create connection requests to athletes"
ON connection_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employer_profiles
    WHERE employer_profiles.id = connection_requests.employer_id
    AND employer_profiles.user_id = auth.uid()
  )
);
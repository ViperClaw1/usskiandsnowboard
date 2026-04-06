-- Update RLS policies for connection_requests to support athlete-initiated requests

-- Drop existing policies
DROP POLICY IF EXISTS "Employers can create connection requests" ON connection_requests;
DROP POLICY IF EXISTS "Employers can view their own requests" ON connection_requests;
DROP POLICY IF EXISTS "Athletes can view requests for them" ON connection_requests;

-- Athletes can create connection requests to employers
CREATE POLICY "Athletes can create connection requests"
ON connection_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = connection_requests.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

-- Athletes can view their own sent requests
CREATE POLICY "Athletes can view their sent requests"
ON connection_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = connection_requests.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

-- Employers can view requests sent to them
CREATE POLICY "Employers can view requests for them"
ON connection_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employer_profiles
    WHERE employer_profiles.id = connection_requests.employer_id
    AND employer_profiles.user_id = auth.uid()
  )
);

-- Employers can update (accept/reject) requests sent to them
CREATE POLICY "Employers can update requests for them"
ON connection_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employer_profiles
    WHERE employer_profiles.id = connection_requests.employer_id
    AND employer_profiles.user_id = auth.uid()
  )
);
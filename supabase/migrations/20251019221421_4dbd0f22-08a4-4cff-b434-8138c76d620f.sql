-- Add column to track who initiated the connection request
ALTER TABLE connection_requests 
ADD COLUMN IF NOT EXISTS initiated_by_user_id UUID REFERENCES auth.users(id);

-- Update existing records: we'll set the athlete's user_id as the initiator for existing pending requests
-- This assumes most existing requests were initiated by athletes
UPDATE connection_requests cr
SET initiated_by_user_id = ap.user_id
FROM athlete_profiles ap
WHERE cr.athlete_id = ap.id 
  AND cr.initiated_by_user_id IS NULL;
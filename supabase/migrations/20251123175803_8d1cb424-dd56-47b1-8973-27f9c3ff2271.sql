-- Drop existing foreign key constraint if it exists
ALTER TABLE connection_requests 
DROP CONSTRAINT IF EXISTS connection_requests_initiated_by_user_id_fkey;

-- Recreate with CASCADE delete - when user is deleted, set initiated_by_user_id to NULL
ALTER TABLE connection_requests
ADD CONSTRAINT connection_requests_initiated_by_user_id_fkey 
FOREIGN KEY (initiated_by_user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Create function to clean up connection requests when athlete profile is deleted
CREATE OR REPLACE FUNCTION cleanup_athlete_connection_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all connection requests where this athlete is involved
  DELETE FROM connection_requests 
  WHERE athlete_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create function to clean up connection requests when employer profile is deleted
CREATE OR REPLACE FUNCTION cleanup_employer_connection_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all connection requests where this employer is involved
  DELETE FROM connection_requests 
  WHERE employer_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger for athlete profile deletion
DROP TRIGGER IF EXISTS cleanup_athlete_connections_on_delete ON athlete_profiles;
CREATE TRIGGER cleanup_athlete_connections_on_delete
  BEFORE DELETE ON athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_athlete_connection_requests();

-- Create trigger for employer profile deletion
DROP TRIGGER IF EXISTS cleanup_employer_connections_on_delete ON employer_profiles;
CREATE TRIGGER cleanup_employer_connections_on_delete
  BEFORE DELETE ON employer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_employer_connection_requests();

-- Ensure athlete_profiles cascade deletes properly
ALTER TABLE athlete_profiles
DROP CONSTRAINT IF EXISTS athlete_profiles_profile_fkey;

ALTER TABLE athlete_profiles
ADD CONSTRAINT athlete_profiles_profile_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Ensure employer_profiles cascade deletes properly  
ALTER TABLE employer_profiles
DROP CONSTRAINT IF EXISTS employer_profiles_profile_fkey;

ALTER TABLE employer_profiles
ADD CONSTRAINT employer_profiles_profile_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
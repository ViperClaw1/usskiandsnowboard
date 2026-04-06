-- Add first_name and last_name to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Create trigger to update full_name from first_name and last_name
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_full_name ON profiles;
CREATE TRIGGER update_profiles_full_name
BEFORE INSERT OR UPDATE OF first_name, last_name ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_full_name();
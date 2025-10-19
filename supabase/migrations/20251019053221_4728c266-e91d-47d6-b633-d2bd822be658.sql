-- Add profile_completeness column to employer_profiles
ALTER TABLE employer_profiles 
ADD COLUMN profile_completeness integer DEFAULT 0;

-- Create function to calculate employer profile completeness
CREATE OR REPLACE FUNCTION calculate_employer_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
  completeness INTEGER := 0;
  total_fields INTEGER := 5;
BEGIN
  -- Check each field and add to completeness
  IF NEW.logo_url IS NOT NULL THEN
    completeness := completeness + 1;
  END IF;
  
  IF NEW.about IS NOT NULL AND LENGTH(NEW.about) > 0 THEN
    completeness := completeness + 1;
  END IF;
  
  IF NEW.website IS NOT NULL AND LENGTH(NEW.website) > 0 THEN
    completeness := completeness + 1;
  END IF;
  
  IF NEW.linkedin_url IS NOT NULL AND LENGTH(NEW.linkedin_url) > 0 THEN
    completeness := completeness + 1;
  END IF;
  
  IF NEW.industry IS NOT NULL AND LENGTH(NEW.industry) > 0 THEN
    completeness := completeness + 1;
  END IF;
  
  -- Calculate percentage
  NEW.profile_completeness := (completeness * 100) / total_fields;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update profile completeness
CREATE TRIGGER update_employer_profile_completeness
BEFORE INSERT OR UPDATE ON employer_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_employer_profile_completeness();

-- Update existing records
UPDATE employer_profiles SET updated_at = updated_at;
-- Fix the function to have immutable search_path
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
$$ LANGUAGE plpgsql SET search_path = public;
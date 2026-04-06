-- Add website and linkedin_url columns to employer_profiles
ALTER TABLE employer_profiles 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS linkedin_url text;
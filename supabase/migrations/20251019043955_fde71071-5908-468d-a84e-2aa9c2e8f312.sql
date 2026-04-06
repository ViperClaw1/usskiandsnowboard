-- Add profile_views column to employer_profiles table
ALTER TABLE employer_profiles 
ADD COLUMN profile_views integer DEFAULT 0;
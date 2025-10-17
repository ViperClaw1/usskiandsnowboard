-- Add profile_views column to athlete_profiles table
ALTER TABLE public.athlete_profiles 
ADD COLUMN profile_views integer DEFAULT 0;
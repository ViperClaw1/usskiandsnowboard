-- Add sponsors column to athlete_profiles table
ALTER TABLE public.athlete_profiles
ADD COLUMN sponsors TEXT[];
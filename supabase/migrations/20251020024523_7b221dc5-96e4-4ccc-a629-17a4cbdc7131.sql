-- Add affiliation column to athlete_profiles table
ALTER TABLE public.athlete_profiles
ADD COLUMN affiliation TEXT CHECK (affiliation IN ('Current Team Member', 'Former Team Member'));
-- Add professional_highlights and years_of_membership columns to athlete_profiles table
ALTER TABLE public.athlete_profiles 
ADD COLUMN professional_highlights text,
ADD COLUMN years_of_membership integer;
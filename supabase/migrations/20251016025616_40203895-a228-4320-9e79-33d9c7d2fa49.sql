-- Add about field to employer_profiles table
ALTER TABLE public.employer_profiles
ADD COLUMN about TEXT;
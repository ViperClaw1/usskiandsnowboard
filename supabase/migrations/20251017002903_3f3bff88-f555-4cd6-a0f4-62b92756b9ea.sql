-- Add company_size and hq_location columns to employer_profiles table
ALTER TABLE public.employer_profiles 
ADD COLUMN company_size text,
ADD COLUMN hq_location text;
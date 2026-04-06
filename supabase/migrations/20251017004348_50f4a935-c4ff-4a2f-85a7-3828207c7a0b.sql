-- Add email to athlete profiles
ALTER TABLE public.athlete_profiles 
ADD COLUMN email text;

-- Add contact title and email to employer profiles
ALTER TABLE public.employer_profiles 
ADD COLUMN contact_title text,
ADD COLUMN contact_email text;
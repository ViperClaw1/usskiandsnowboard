-- Add home_mountain field to athlete_profiles
ALTER TABLE public.athlete_profiles 
ADD COLUMN home_mountain TEXT;

-- Add structured job links field to employer_profiles
-- We'll store job links as JSONB for flexibility
ALTER TABLE public.employer_profiles 
ADD COLUMN job_board_url TEXT,
ADD COLUMN individual_roles JSONB DEFAULT '[]'::jsonb;
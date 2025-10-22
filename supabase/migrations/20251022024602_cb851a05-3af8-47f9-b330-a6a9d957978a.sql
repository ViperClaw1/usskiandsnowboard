-- Add foreign key from athlete_profiles to profiles
ALTER TABLE public.athlete_profiles 
DROP CONSTRAINT IF EXISTS athlete_profiles_profile_fkey,
ADD CONSTRAINT athlete_profiles_profile_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Add foreign key from employer_profiles to profiles  
ALTER TABLE public.employer_profiles 
DROP CONSTRAINT IF EXISTS employer_profiles_profile_fkey,
ADD CONSTRAINT employer_profiles_profile_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
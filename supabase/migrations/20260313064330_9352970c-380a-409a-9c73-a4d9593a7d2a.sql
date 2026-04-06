ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS background_image_url text;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS background_image_url text;
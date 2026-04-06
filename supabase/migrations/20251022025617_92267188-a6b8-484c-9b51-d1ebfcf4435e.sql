-- Add gallery images columns to athlete_profiles
ALTER TABLE public.athlete_profiles 
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS gallery_images text[];
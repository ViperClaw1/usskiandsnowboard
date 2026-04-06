-- Add phone number to profiles table for SMS notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS 'User phone number for SMS notifications';
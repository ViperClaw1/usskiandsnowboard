-- Add phone column to athlete_profiles
ALTER TABLE public.athlete_profiles
ADD COLUMN phone text;

-- Add phone column to employer_profiles
ALTER TABLE public.employer_profiles
ADD COLUMN phone text;

-- Add SMS notification preference to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN sms_notifications_enabled boolean NOT NULL DEFAULT false;
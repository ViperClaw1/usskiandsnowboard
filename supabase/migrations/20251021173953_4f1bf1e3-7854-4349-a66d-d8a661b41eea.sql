-- Add admin-specific notification preferences to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_new_accounts boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_connections_declined boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.notification_preferences.email_new_accounts IS 'Admin: Notify when new users register';
COMMENT ON COLUMN public.notification_preferences.email_connections_declined IS 'Admin: Notify when connections are declined';
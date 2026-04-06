-- First, clean up orphaned records (profiles without auth users)
DELETE FROM public.athlete_profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.employer_profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.notification_preferences 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.notifications 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now add CASCADE constraints to ensure future deletions clean up properly
-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE public.athlete_profiles 
DROP CONSTRAINT IF EXISTS athlete_profiles_user_id_fkey,
ADD CONSTRAINT athlete_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.employer_profiles 
DROP CONSTRAINT IF EXISTS employer_profiles_user_id_fkey,
ADD CONSTRAINT employer_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey,
ADD CONSTRAINT notification_preferences_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
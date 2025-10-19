-- Remove the hardcoded admin email trigger and function using CASCADE
-- This allows admins to grant admin access through the UI instead

DROP TRIGGER IF EXISTS auto_admin_role_assignment ON public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.auto_assign_admin_role() CASCADE;
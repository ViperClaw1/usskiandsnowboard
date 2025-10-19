-- Create admin user account
-- Note: This inserts directly into auth.users which requires special handling
-- We'll create the profile and role, and you'll need to sign up manually with the credentials

-- First, let's create a function to set up admin user after signup
CREATE OR REPLACE FUNCTION setup_admin_user(user_email TEXT, user_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This function is a placeholder - actual user creation happens through Supabase Auth
  -- But we can pre-create the role assignment for when the user signs up
  
  RETURN 'Please sign up with admin@usskiandsnowboard.org to create the admin account';
END;
$$;

-- Create a trigger to automatically assign admin role for the specific email
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user email is the admin email
  IF NEW.email = 'admin@usskiandsnowboard.org' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS auto_admin_role_assignment ON public.profiles;
CREATE TRIGGER auto_admin_role_assignment
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_role();
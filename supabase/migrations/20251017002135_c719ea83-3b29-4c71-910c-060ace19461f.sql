-- Update the handle_new_user function to automatically assign role based on signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Automatically assign role based on user_type from signup metadata
  IF NEW.raw_user_meta_data->>'user_type' = 'employer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employer'::app_role);
  ELSIF NEW.raw_user_meta_data->>'user_type' = 'athlete' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'athlete'::app_role);
  END IF;
  
  RETURN NEW;
END;
$function$;
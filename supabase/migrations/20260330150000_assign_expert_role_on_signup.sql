-- Ensure new signups with user_type=expert get an expert app role automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  IF NEW.raw_user_meta_data->>'user_type' = 'employer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employer'::app_role);
  ELSIF NEW.raw_user_meta_data->>'user_type' = 'expert' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'expert'::app_role);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'athlete'::app_role);
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill existing expert signups that may have been created without a role.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'expert'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE COALESCE(u.raw_user_meta_data->>'user_type', '') = 'expert'
  AND ur.user_id IS NULL;

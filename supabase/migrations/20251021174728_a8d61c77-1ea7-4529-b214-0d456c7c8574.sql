-- Ensure trigger exists for new user notifications (recreate if needed)
DROP TRIGGER IF EXISTS on_new_user_registration ON public.profiles;

CREATE TRIGGER on_new_user_registration
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();

-- Create in-app notifications for admins when new users register
CREATE OR REPLACE FUNCTION public.create_admin_notification_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id UUID;
  user_role TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get the user's role
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Create notification title and message
  notification_title := 'New User Registration';
  notification_message := NEW.full_name || ' has registered as a ' || COALESCE(user_role, 'user');

  -- Create in-app notification for all admins
  FOR admin_user_id IN 
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (admin_user_id, 'new_account', notification_title, notification_message, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger for in-app admin notifications
DROP TRIGGER IF EXISTS on_new_user_admin_notification ON public.profiles;

CREATE TRIGGER on_new_user_admin_notification
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_admin_notification_for_new_user();
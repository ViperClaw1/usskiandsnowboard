-- Update the notify_connection_event function to handle declined connections
CREATE OR REPLACE FUNCTION public.notify_connection_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_type TEXT;
  supabase_url TEXT;
  supabase_service_key TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://fihcubajfjjbcjqiqqrv.supabase.co';
  END IF;
  
  -- Determine notification type
  IF TG_OP = 'INSERT' THEN
    notification_type := 'new_request';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    notification_type := 'request_accepted';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    notification_type := 'request_declined';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Make async HTTP request to edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-connection-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_service_key
    ),
    body := jsonb_build_object(
      'notification_type', notification_type,
      'request_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Create function to notify admins when new users register
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT;
  supabase_service_key TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://fihcubajfjjbcjqiqqrv.supabase.co';
  END IF;
  
  -- Notify admins about new user registration
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-admin-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_service_key
    ),
    body := jsonb_build_object(
      'notification_type', 'new_account',
      'user_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new user registrations
DROP TRIGGER IF EXISTS on_new_user_registration ON public.profiles;
CREATE TRIGGER on_new_user_registration
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();
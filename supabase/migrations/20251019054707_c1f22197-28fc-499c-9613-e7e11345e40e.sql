-- Create trigger function to notify about connection request events
CREATE OR REPLACE FUNCTION public.notify_connection_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type TEXT;
  supabase_url TEXT;
  supabase_service_key TEXT;
BEGIN
  -- Get environment variables
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  
  -- Use project URL if env var not set
  IF supabase_url IS NULL THEN
    supabase_url := 'https://fihcubajfjjbcjqiqqrv.supabase.co';
  END IF;
  
  -- Determine notification type
  IF TG_OP = 'INSERT' THEN
    notification_type := 'new_request';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    notification_type := 'request_accepted';
  ELSE
    -- Don't send notifications for other updates
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
$$;

-- Create trigger on connection_requests table
DROP TRIGGER IF EXISTS on_connection_request_event ON public.connection_requests;
CREATE TRIGGER on_connection_request_event
  AFTER INSERT OR UPDATE ON public.connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_connection_event();
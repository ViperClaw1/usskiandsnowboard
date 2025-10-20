-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow system to insert notifications
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create notification on connection request
CREATE OR REPLACE FUNCTION public.create_connection_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_user_id UUID;
  sender_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Determine recipient and message based on who initiated
  IF TG_OP = 'INSERT' THEN
    -- New connection request
    IF NEW.initiated_by_user_id IS NOT NULL THEN
      -- Get the recipient's user_id
      IF NEW.initiated_by_user_id = (SELECT user_id FROM athlete_profiles WHERE id = NEW.athlete_id) THEN
        -- Athlete initiated, notify employer
        recipient_user_id := (SELECT user_id FROM employer_profiles WHERE id = NEW.employer_id);
        sender_name := (SELECT full_name FROM profiles WHERE id = NEW.initiated_by_user_id);
        notification_title := 'New Connection Request';
        notification_message := sender_name || ' sent you a connection request';
      ELSE
        -- Employer initiated, notify athlete
        recipient_user_id := (SELECT user_id FROM athlete_profiles WHERE id = NEW.athlete_id);
        sender_name := (SELECT company_name FROM employer_profiles WHERE id = NEW.employer_id);
        notification_title := 'New Connection Request';
        notification_message := sender_name || ' sent you a connection request';
      END IF;
      
      -- Create notification
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (recipient_user_id, 'connection_request', notification_title, notification_message, NEW.id);
    END IF;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Connection accepted, notify the initiator
    sender_name := (SELECT full_name FROM profiles WHERE id = NEW.initiated_by_user_id);
    
    -- Determine who to notify
    IF NEW.initiated_by_user_id = (SELECT user_id FROM athlete_profiles WHERE id = NEW.athlete_id) THEN
      -- Athlete initiated, employer accepted
      recipient_user_id := NEW.initiated_by_user_id;
      sender_name := (SELECT company_name FROM employer_profiles WHERE id = NEW.employer_id);
    ELSE
      -- Employer initiated, athlete accepted
      recipient_user_id := NEW.initiated_by_user_id;
      sender_name := (SELECT full_name FROM profiles WHERE id = (SELECT user_id FROM athlete_profiles WHERE id = NEW.athlete_id));
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (recipient_user_id, 'connection_accepted', 'Connection Accepted', sender_name || ' accepted your connection request', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for connection notifications
CREATE TRIGGER connection_notification_trigger
AFTER INSERT OR UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_connection_notification();
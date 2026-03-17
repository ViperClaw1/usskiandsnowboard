-- Fix notifications INSERT policy: restrict to owner only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);
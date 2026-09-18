-- Drop overly broad public read on notification_preferences; the per-user policy already covers legitimate reads
DROP POLICY IF EXISTS "System can read all notification preferences" ON public.notification_preferences;

-- email_verification_send_log: RLS already enabled with no public policies (service-role only).
-- Add an admin-only read policy for support/debugging visibility.
CREATE POLICY "Admins can read email verification send log"
  ON public.email_verification_send_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Prevent privilege escalation: users can only self-assign 'athlete' or 'employer', never 'admin'
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;

CREATE POLICY "Users can create their initial role" ON public.user_roles
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('athlete', 'employer')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    )
  );
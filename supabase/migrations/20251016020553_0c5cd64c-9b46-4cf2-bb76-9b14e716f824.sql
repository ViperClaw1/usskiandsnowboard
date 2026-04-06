-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;

-- Allow users to insert their own role if they don't have one yet
CREATE POLICY "Users can create their initial role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );
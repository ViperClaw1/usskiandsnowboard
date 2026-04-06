CREATE POLICY "Experts can update requests for them"
ON public.expert_connection_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.expert_profiles
    WHERE expert_profiles.id = expert_connection_requests.expert_id
      AND expert_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.expert_profiles
    WHERE expert_profiles.id = expert_connection_requests.expert_id
      AND expert_profiles.user_id = auth.uid()
  )
);

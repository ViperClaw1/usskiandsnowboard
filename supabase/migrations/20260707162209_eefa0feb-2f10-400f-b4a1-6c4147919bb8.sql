
ALTER TABLE public.job_posts ALTER COLUMN expert_id DROP NOT NULL;

DROP POLICY IF EXISTS "Experts can insert their own job posts" ON public.job_posts;
CREATE POLICY "Experts and admins can insert job posts"
ON public.job_posts
FOR INSERT
TO authenticated
WITH CHECK (
  (expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid()))
  OR (expert_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Experts can update their own job posts" ON public.job_posts;
CREATE POLICY "Experts and admins can update job posts"
ON public.job_posts
FOR UPDATE
TO authenticated
USING (
  (expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

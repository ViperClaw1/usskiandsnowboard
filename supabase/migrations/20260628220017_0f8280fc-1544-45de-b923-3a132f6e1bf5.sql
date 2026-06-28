
-- Enums
CREATE TYPE public.job_post_status AS ENUM ('active', 'filled', 'expired', 'pending');
CREATE TYPE public.job_remote_status AS ENUM ('Remote', 'Hybrid', 'On-site');

-- job_posts
CREATE TABLE public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  remote_status public.job_remote_status,
  employment_type TEXT,
  industry TEXT,
  expert_note TEXT,
  status public.job_post_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (expert_id, source_url)
);

GRANT SELECT ON public.job_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_posts TO authenticated;
GRANT ALL ON public.job_posts TO service_role;

ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job posts"
  ON public.job_posts FOR SELECT
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'::app_role)
         OR expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can insert their own job posts"
  ON public.job_posts FOR INSERT
  TO authenticated
  WITH CHECK (expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Experts can update their own job posts"
  ON public.job_posts FOR UPDATE
  TO authenticated
  USING (expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Experts and admins can delete job posts"
  ON public.job_posts FOR DELETE
  TO authenticated
  USING (expert_id IN (SELECT id FROM public.expert_profiles WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_posts_updated_at
  BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_job_posts_status_created ON public.job_posts (status, created_at DESC);
CREATE INDEX idx_job_posts_expert ON public.job_posts (expert_id);

-- job_board_settings
CREATE TABLE public.job_board_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  require_approval BOOLEAN NOT NULL DEFAULT false,
  industries TEXT[] NOT NULL DEFAULT ARRAY[
    'Sports & Recreation','Marketing & Media','Finance','Technology',
    'Hospitality','Healthcare','Education','Nonprofit','Sales','Operations','Other'
  ],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.job_board_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.job_board_settings TO anon, authenticated;
GRANT ALL ON public.job_board_settings TO service_role;
GRANT UPDATE ON public.job_board_settings TO authenticated;

ALTER TABLE public.job_board_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read job board settings"
  ON public.job_board_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update job board settings"
  ON public.job_board_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_board_settings_updated_at
  BEFORE UPDATE ON public.job_board_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

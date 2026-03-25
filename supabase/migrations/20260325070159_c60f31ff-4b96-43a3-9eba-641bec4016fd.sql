-- Add 'expert' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';

-- Create expert_profiles table (current_role renamed to job_title to avoid reserved word conflict)
CREATE TABLE IF NOT EXISTS public.expert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  job_title text,
  area_of_expertise text,
  bio text,
  photo_url text,
  background_image_url text,
  industry text,
  is_alum boolean DEFAULT false,
  linkedin_url text,
  email text,
  is_public boolean DEFAULT true,
  profile_completeness integer DEFAULT 0,
  profile_views integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public expert profiles" ON public.expert_profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage all expert profiles" ON public.expert_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Experts can manage their own profile" ON public.expert_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_expert_profiles_updated_at
  BEFORE UPDATE ON public.expert_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create expert_connection_requests table
CREATE TABLE IF NOT EXISTS public.expert_connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  initiated_by_user_id uuid,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expert_id, athlete_id)
);

ALTER TABLE public.expert_connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all expert requests" ON public.expert_connection_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Athletes can create expert requests" ON public.expert_connection_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM athlete_profiles WHERE id = expert_connection_requests.athlete_id AND user_id = auth.uid())
  );

CREATE POLICY "Athletes can view their own expert requests" ON public.expert_connection_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM athlete_profiles WHERE id = expert_connection_requests.athlete_id AND user_id = auth.uid())
  );

CREATE POLICY "Experts can view requests for them" ON public.expert_connection_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM expert_profiles WHERE id = expert_connection_requests.expert_id AND user_id = auth.uid())
  );

CREATE TRIGGER update_expert_connection_requests_updated_at
  BEFORE UPDATE ON public.expert_connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
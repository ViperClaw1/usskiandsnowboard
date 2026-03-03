
CREATE TABLE public.waitlist_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  user_type text NOT NULL,
  profile_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_applicants ENABLE ROW LEVEL SECURITY;

-- Admins can read and update all applicants
CREATE POLICY "Admins can manage waitlist applicants"
  ON public.waitlist_applicants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_waitlist_applicants_updated_at
  BEFORE UPDATE ON public.waitlist_applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

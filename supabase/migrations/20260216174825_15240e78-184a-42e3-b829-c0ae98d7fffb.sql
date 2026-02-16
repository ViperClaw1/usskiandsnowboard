
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE CHECK (role IN ('athlete', 'employer')),
  text_overrides jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Admins can manage layouts
CREATE POLICY "Admins can manage layouts"
  ON public.dashboard_layouts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read layouts
CREATE POLICY "Authenticated users can read layouts"
  ON public.dashboard_layouts FOR SELECT
  TO authenticated
  USING (true);

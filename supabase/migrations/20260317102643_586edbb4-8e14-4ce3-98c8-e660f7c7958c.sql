
ALTER TABLE public.dashboard_layouts
  DROP CONSTRAINT dashboard_layouts_role_check;

ALTER TABLE public.dashboard_layouts
  ADD CONSTRAINT dashboard_layouts_role_check
    CHECK (role = ANY (ARRAY['athlete'::text, 'employer'::text, 'training'::text]));

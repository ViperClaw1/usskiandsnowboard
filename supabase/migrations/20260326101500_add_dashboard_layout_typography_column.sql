ALTER TABLE public.dashboard_layouts
  ADD COLUMN IF NOT EXISTS typography jsonb NOT NULL DEFAULT '{"fontFamily":"Montserrat, sans-serif","fontSize":"16"}'::jsonb;

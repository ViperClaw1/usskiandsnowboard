ALTER TABLE public.training_articles
  ADD COLUMN IF NOT EXISTS author_title text,
  ADD COLUMN IF NOT EXISTS author_affiliation text;
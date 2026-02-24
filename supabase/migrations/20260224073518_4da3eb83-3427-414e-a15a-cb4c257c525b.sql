
-- Create training_articles table
CREATE TABLE public.training_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text,
  body text NOT NULL,
  category text,
  hero_image_url text,
  author_name text,
  author_image_url text,
  status text NOT NULL DEFAULT 'draft',
  reading_time_minutes integer,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.training_articles ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read published articles
CREATE POLICY "Authenticated users can read published articles"
ON public.training_articles
FOR SELECT
TO authenticated
USING (status = 'published');

-- SELECT: admins can read all articles
CREATE POLICY "Admins can read all articles"
ON public.training_articles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: admins only
CREATE POLICY "Admins can insert articles"
ON public.training_articles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: admins only
CREATE POLICY "Admins can update articles"
ON public.training_articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- DELETE: admins only
CREATE POLICY "Admins can delete articles"
ON public.training_articles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_training_articles_updated_at
BEFORE UPDATE ON public.training_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for training images
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', true);

-- Storage policies: public read
CREATE POLICY "Public can view training images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'training-images');

-- Storage: admin insert
CREATE POLICY "Admins can upload training images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage: admin update
CREATE POLICY "Admins can update training images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'training-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage: admin delete
CREATE POLICY "Admins can delete training images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'training-images' AND public.has_role(auth.uid(), 'admin'));

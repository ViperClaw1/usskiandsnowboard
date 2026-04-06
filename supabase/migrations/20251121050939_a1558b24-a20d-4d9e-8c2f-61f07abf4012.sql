-- Create storage buckets for athlete media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('athlete-videos', 'athlete-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('athlete-documents', 'athlete-documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);

-- Create RLS policies for athlete videos bucket
CREATE POLICY "Athletes can upload their own videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'athlete-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Athletes can update their own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'athlete-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Athletes can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'athlete-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view athlete videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-videos');

-- Create RLS policies for athlete documents bucket
CREATE POLICY "Athletes can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'athlete-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Athletes can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Athletes can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Athletes can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all athlete documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Employers can view documents for connected athletes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM connection_requests cr
    JOIN athlete_profiles ap ON ap.id = cr.athlete_id
    JOIN employer_profiles ep ON ep.id = cr.employer_id
    WHERE cr.status = 'accepted'
    AND ap.user_id::text = (storage.foldername(name))[1]
    AND ep.user_id = auth.uid()
  )
);

-- Create athlete_videos table
CREATE TABLE public.athlete_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN ('competition', 'introduction', 'highlight', 'other')),
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for athlete_videos
CREATE POLICY "Athletes can manage their own videos"
ON public.athlete_videos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_videos.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view videos for public profiles"
ON public.athlete_videos FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_videos.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Employers can view videos for public profiles"
ON public.athlete_videos FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_videos.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Admins can view all videos"
ON public.athlete_videos FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create athlete_documents table
CREATE TABLE public.athlete_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'transcript', 'certification', 'reference', 'other')),
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for athlete_documents
CREATE POLICY "Athletes can manage their own documents"
ON public.athlete_documents FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_documents.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Athletes can view their own documents"
ON public.athlete_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_documents.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Employers can view documents for connected athletes"
ON public.athlete_documents FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM connection_requests cr
    JOIN athlete_profiles ap ON ap.id = cr.athlete_id
    WHERE cr.status = 'accepted'
    AND ap.id = athlete_documents.athlete_id
    AND cr.employer_id IN (
      SELECT id FROM employer_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all documents"
ON public.athlete_documents FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create athlete_achievements table
CREATE TABLE public.athlete_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  achievement_date DATE NOT NULL,
  category TEXT CHECK (category IN ('competition', 'training', 'milestone', 'other')),
  location TEXT,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for athlete_achievements
CREATE POLICY "Athletes can manage their own achievements"
ON public.athlete_achievements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_achievements.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view achievements for public profiles"
ON public.athlete_achievements FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_achievements.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Employers can view achievements for public profiles"
ON public.athlete_achievements FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_achievements.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Admins can view all achievements"
ON public.athlete_achievements FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create athlete_awards table
CREATE TABLE public.athlete_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  issuer TEXT NOT NULL,
  award_date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_awards ENABLE ROW LEVEL SECURITY;

-- RLS policies for athlete_awards
CREATE POLICY "Athletes can manage their own awards"
ON public.athlete_awards FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_awards.athlete_id
    AND athlete_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view awards for public profiles"
ON public.athlete_awards FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_awards.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Employers can view awards for public profiles"
ON public.athlete_awards FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM athlete_profiles
    WHERE athlete_profiles.id = athlete_awards.athlete_id
    AND athlete_profiles.is_public = true
  )
);

CREATE POLICY "Admins can view all awards"
ON public.athlete_awards FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add update triggers for updated_at columns
CREATE TRIGGER update_athlete_videos_updated_at
  BEFORE UPDATE ON public.athlete_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athlete_documents_updated_at
  BEFORE UPDATE ON public.athlete_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athlete_achievements_updated_at
  BEFORE UPDATE ON public.athlete_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athlete_awards_updated_at
  BEFORE UPDATE ON public.athlete_awards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
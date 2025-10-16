-- Create table for storing news articles
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  date TEXT,
  excerpt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(url)
);

-- Enable Row Level Security
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone can view articles)
CREATE POLICY "Anyone can view news articles" 
ON public.news_articles 
FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_news_articles_created_at ON public.news_articles(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_news_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_news_articles_updated_at();
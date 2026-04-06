
-- Convert the date column from text to date type
-- First, update any invalid date values to NULL
UPDATE public.news_articles 
SET date = NULL 
WHERE date IS NOT NULL AND date !~ '^\d{4}-\d{2}-\d{2}$';

-- Now alter the column type
ALTER TABLE public.news_articles 
ALTER COLUMN date TYPE date USING date::date;

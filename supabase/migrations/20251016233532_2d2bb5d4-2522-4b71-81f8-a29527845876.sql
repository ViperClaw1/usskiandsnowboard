-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up cron job to scrape news every 6 hours
SELECT cron.schedule(
  'scrape-news-every-6-hours',
  '0 */6 * * *', -- At minute 0 past every 6th hour
  $$
  SELECT
    net.http_post(
        url:='https://fihcubajfjjbcjqiqqrv.supabase.co/functions/v1/scrape-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaGN1YmFqZmpqYmNqcWlxcXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MTkxOTgsImV4cCI6MjA3NjA5NTE5OH0.WB7RT62mAFFq850JFyECZVxF-cciXAjpj4TKWXFi-hQ"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
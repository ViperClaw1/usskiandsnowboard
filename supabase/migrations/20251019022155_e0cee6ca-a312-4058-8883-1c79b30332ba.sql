-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions to execute HTTP requests
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA extensions GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA extensions GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Schedule news scraper to run at 12am (00:00) daily
SELECT cron.schedule(
  'scrape-news-midnight',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fihcubajfjjbcjqiqqrv.supabase.co/functions/v1/scrape-news',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule news scraper to run at 12pm (12:00) daily
SELECT cron.schedule(
  'scrape-news-noon',
  '0 12 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fihcubajfjjbcjqiqqrv.supabase.co/functions/v1/scrape-news',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);
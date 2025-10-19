-- Create analytics view for admin dashboard
CREATE OR REPLACE VIEW admin_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM athlete_profiles) as total_athletes,
  (SELECT COUNT(*) FROM employer_profiles) as total_employers,
  (SELECT COUNT(*) FROM connection_requests) as total_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'accepted') as accepted_connections,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'rejected') as rejected_requests,
  (SELECT ROUND(AVG(profile_completeness)) FROM athlete_profiles) as avg_athlete_completeness,
  (SELECT ROUND(AVG(profile_completeness)) FROM employer_profiles) as avg_employer_completeness;

-- Create view for user activity by day (last 30 days)
CREATE OR REPLACE VIEW user_signups_by_day AS
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE id IN (SELECT user_id FROM athlete_profiles)) as athlete_signups,
  COUNT(*) FILTER (WHERE id IN (SELECT user_id FROM employer_profiles)) as employer_signups
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- Create view for connection requests by day (last 30 days)
CREATE OR REPLACE VIEW connections_by_day AS
SELECT
  DATE(created_at) as request_date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM connection_requests
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY request_date DESC;

-- Create view for athlete distribution by sport
CREATE OR REPLACE VIEW athletes_by_sport AS
SELECT
  sport_discipline,
  COUNT(*) as count
FROM athlete_profiles
WHERE sport_discipline IS NOT NULL
GROUP BY sport_discipline
ORDER BY count DESC;

-- Create view for employer distribution by industry
CREATE OR REPLACE VIEW employers_by_industry AS
SELECT
  industry,
  COUNT(*) as count
FROM employer_profiles
WHERE industry IS NOT NULL
GROUP BY industry
ORDER BY count DESC;

-- Create view for top viewed athlete profiles
CREATE OR REPLACE VIEW top_athlete_profiles AS
SELECT
  ap.id,
  p.full_name,
  ap.sport_discipline,
  ap.profile_views,
  ap.profile_completeness
FROM athlete_profiles ap
JOIN profiles p ON p.id = ap.user_id
ORDER BY ap.profile_views DESC
LIMIT 10;

-- Create view for top viewed employer profiles
CREATE OR REPLACE VIEW top_employer_profiles AS
SELECT
  ep.id,
  ep.company_name,
  ep.industry,
  ep.profile_views,
  ep.profile_completeness
FROM employer_profiles ep
ORDER BY ep.profile_views DESC
LIMIT 10;

-- Grant admin access to views
GRANT SELECT ON admin_analytics_summary TO authenticated;
GRANT SELECT ON user_signups_by_day TO authenticated;
GRANT SELECT ON connections_by_day TO authenticated;
GRANT SELECT ON athletes_by_sport TO authenticated;
GRANT SELECT ON employers_by_industry TO authenticated;
GRANT SELECT ON top_athlete_profiles TO authenticated;
GRANT SELECT ON top_employer_profiles TO authenticated;
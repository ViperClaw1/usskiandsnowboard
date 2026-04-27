DROP VIEW IF EXISTS admin_analytics_summary;

CREATE VIEW admin_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM athlete_profiles) as total_athletes,
  (SELECT COUNT(*) FROM employer_profiles) as total_employers,
  (SELECT COUNT(*) FROM expert_profiles) as total_experts,
  (SELECT COUNT(*) FROM connection_requests) as total_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'accepted') as accepted_connections,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'rejected') as rejected_requests,
  (SELECT COUNT(*) FROM expert_connection_requests WHERE status = 'accepted') as accepted_expert_connections,
  (SELECT ROUND(AVG(profile_completeness)) FROM athlete_profiles) as avg_athlete_completeness,
  (SELECT ROUND(AVG(profile_completeness)) FROM employer_profiles) as avg_employer_completeness,
  (SELECT ROUND(AVG(profile_completeness)) FROM expert_profiles) as avg_expert_completeness;

GRANT SELECT ON admin_analytics_summary TO authenticated;
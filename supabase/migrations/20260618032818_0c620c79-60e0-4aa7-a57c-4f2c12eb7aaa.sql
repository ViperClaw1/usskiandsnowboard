CREATE OR REPLACE VIEW public.connections_by_day AS
WITH all_requests AS (
  SELECT created_at, status FROM public.connection_requests
  WHERE created_at >= (now() - interval '30 days')
  UNION ALL
  SELECT created_at, status FROM public.expert_connection_requests
  WHERE created_at >= (now() - interval '30 days')
)
SELECT
  date(created_at) AS request_date,
  count(*) AS total_requests,
  count(*) FILTER (WHERE status = 'accepted') AS accepted,
  count(*) FILTER (WHERE status = 'pending') AS pending,
  count(*) FILTER (WHERE status = 'rejected') AS rejected
FROM all_requests
GROUP BY date(created_at)
ORDER BY date(created_at) DESC;

GRANT SELECT ON public.connections_by_day TO authenticated, anon, service_role;
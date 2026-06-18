DROP VIEW IF EXISTS public.user_signups_by_day;
CREATE VIEW public.user_signups_by_day AS
SELECT
  date(created_at) AS signup_date,
  count(*) AS signups,
  count(*) FILTER (WHERE id IN (SELECT user_id FROM public.athlete_profiles)) AS athlete_signups,
  count(*) FILTER (WHERE id IN (SELECT user_id FROM public.expert_profiles)) AS expert_signups
FROM public.profiles
WHERE created_at >= (now() - interval '30 days')
GROUP BY date(created_at)
ORDER BY date(created_at) DESC;

GRANT SELECT ON public.user_signups_by_day TO authenticated, anon, service_role;
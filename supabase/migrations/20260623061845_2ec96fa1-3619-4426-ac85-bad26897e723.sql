
-- 1) Enable RLS on email_verification_send_log and lock it down
ALTER TABLE public.email_verification_send_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_verification_send_log FROM anon, authenticated;
GRANT ALL ON public.email_verification_send_log TO service_role;

-- No policies for anon/authenticated = no access. Edge functions use service_role and bypass RLS.

-- 2) Convert SECURITY DEFINER views to SECURITY INVOKER so RLS applies to the calling user
ALTER VIEW public.top_athlete_profiles      SET (security_invoker = true);
ALTER VIEW public.athletes_by_sport         SET (security_invoker = true);
ALTER VIEW public.connections_by_day        SET (security_invoker = true);
ALTER VIEW public.employers_by_industry     SET (security_invoker = true);
ALTER VIEW public.top_employer_profiles     SET (security_invoker = true);
ALTER VIEW public.user_signups_by_day       SET (security_invoker = true);
ALTER VIEW public.top_expert_profiles       SET (security_invoker = true);
ALTER VIEW public.admin_analytics_summary   SET (security_invoker = true);

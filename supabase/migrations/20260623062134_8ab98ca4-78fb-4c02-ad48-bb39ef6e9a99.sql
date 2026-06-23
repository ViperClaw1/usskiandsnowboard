
-- =====================================================================
-- 1) Lock down SECURITY DEFINER function EXECUTE privileges
-- =====================================================================
-- Triggers fire regardless of EXECUTE grants. RPC-callable functions are
-- explicitly re-granted below.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_connection_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.setup_admin_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_oauth_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_oauth_signup_hook(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_connection_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_connection_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_admin_notification_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_notification_preferences() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_athlete_connection_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_employer_connection_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_full_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_news_articles_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_expert_profile_completeness() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_employer_profile_completeness() FROM PUBLIC, anon, authenticated;

-- has_role used in RLS policies — RLS calls it as the policy's security context, but it also needs authenticated execute for any direct usage
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Profile view counters: keep callable by signed-in users only (not anon)
REVOKE EXECUTE ON FUNCTION public.increment_athlete_profile_views(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_employer_profile_views(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_expert_profile_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_athlete_profile_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_employer_profile_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_expert_profile_views(uuid) TO authenticated;

-- =====================================================================
-- 2) Add missing search_path to 3 functions
-- =====================================================================
ALTER FUNCTION public.calculate_expert_profile_completeness() SET search_path = public;
ALTER FUNCTION public.calculate_employer_profile_completeness() SET search_path = public;
ALTER FUNCTION public.update_news_articles_updated_at() SET search_path = public;

-- =====================================================================
-- 3) Tighten storage bucket SELECT policies (block anon directory listing,
--    keep public URL access intact since buckets remain public)
-- =====================================================================
DROP POLICY IF EXISTS "Allow public to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view athlete photos" ON storage.objects;
DROP POLICY IF EXISTS "Athlete photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view athlete videos" ON storage.objects;

CREATE POLICY "Authenticated users can list company logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can list athlete photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'athlete-photos');

CREATE POLICY "Authenticated users can list athlete videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'athlete-videos');

-- =====================================================================
-- 4) Admin audit log
-- =====================================================================
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies = only service_role (edge functions) can write.

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_actor ON public.admin_audit_log(actor_user_id);

-- =====================================================================
-- 5) Retention helper for email_verification_send_log
-- =====================================================================
CREATE OR REPLACE FUNCTION public.purge_old_email_verification_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.email_verification_send_log
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_old_email_verification_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_email_verification_logs() TO service_role;

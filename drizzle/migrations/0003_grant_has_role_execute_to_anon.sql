-- RLS policies that call public.has_role() must be executable by every role the
-- policies can apply to (including anon); otherwise reads fail with 401/permission denied.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
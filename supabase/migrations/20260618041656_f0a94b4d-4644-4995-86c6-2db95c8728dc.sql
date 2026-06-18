
CREATE OR REPLACE FUNCTION public.increment_athlete_profile_views(athlete_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.athlete_profiles
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = athlete_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_expert_profile_views(expert_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.expert_profiles
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = expert_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_athlete_profile_views(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_expert_profile_views(uuid) TO authenticated, anon;

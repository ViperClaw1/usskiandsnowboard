
CREATE OR REPLACE FUNCTION public.increment_employer_profile_views(employer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employer_profiles
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = employer_profile_id;
END;
$$;

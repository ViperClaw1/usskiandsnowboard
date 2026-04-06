CREATE OR REPLACE FUNCTION public.calculate_expert_profile_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  filled_fields integer := 0;
  total_fields constant integer := 8;
BEGIN
  IF NULLIF(TRIM(COALESCE(NEW.full_name, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.job_title, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.area_of_expertise, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.bio, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.industry, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.email, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.photo_url, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  IF NULLIF(TRIM(COALESCE(NEW.headshot, '')), '') IS NOT NULL THEN
    filled_fields := filled_fields + 1;
  END IF;

  NEW.profile_completeness := ROUND((filled_fields::numeric / total_fields) * 100)::integer;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_expert_profile_completeness ON public.expert_profiles;

CREATE TRIGGER update_expert_profile_completeness
BEFORE INSERT OR UPDATE ON public.expert_profiles
FOR EACH ROW
EXECUTE FUNCTION public.calculate_expert_profile_completeness();

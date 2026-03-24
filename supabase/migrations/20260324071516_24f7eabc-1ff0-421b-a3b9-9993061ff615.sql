-- Drop all views that depend on sport_discipline
DROP VIEW IF EXISTS public.athletes_by_sport;
DROP VIEW IF EXISTS public.top_athlete_profiles;

-- Alter sport_discipline to text[]
ALTER TABLE public.athlete_profiles
  ALTER COLUMN sport_discipline TYPE text[]
  USING CASE
    WHEN sport_discipline IS NULL THEN NULL
    ELSE ARRAY[sport_discipline]
  END;

-- Recreate athletes_by_sport — unnest array so each discipline is counted individually
CREATE OR REPLACE VIEW public.athletes_by_sport AS
SELECT
  unnested.sport_discipline,
  COUNT(*) AS count
FROM (
  SELECT unnest(sport_discipline) AS sport_discipline
  FROM athlete_profiles
  WHERE sport_discipline IS NOT NULL AND array_length(sport_discipline, 1) > 0
) AS unnested
GROUP BY unnested.sport_discipline
ORDER BY COUNT(*) DESC;

-- Recreate top_athlete_profiles — sport_discipline is now text[], keep as-is (array displayed in app)
CREATE OR REPLACE VIEW public.top_athlete_profiles AS
SELECT
  ap.id,
  p.full_name,
  ap.sport_discipline,
  ap.profile_views,
  ap.profile_completeness
FROM (athlete_profiles ap
  JOIN profiles p ON (p.id = ap.user_id))
ORDER BY ap.profile_views DESC
LIMIT 10;
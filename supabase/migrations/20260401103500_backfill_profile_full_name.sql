-- Fill missing profile full_name from existing first/last name data.
UPDATE public.profiles
SET full_name = NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), '')
WHERE full_name IS NULL
  AND NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), '') IS NOT NULL;

-- Fill remaining missing profile full_name from expert profile full_name.
UPDATE public.profiles p
SET full_name = ep.full_name
FROM public.expert_profiles ep
WHERE p.id = ep.user_id
  AND p.full_name IS NULL
  AND ep.full_name IS NOT NULL
  AND TRIM(ep.full_name) <> '';

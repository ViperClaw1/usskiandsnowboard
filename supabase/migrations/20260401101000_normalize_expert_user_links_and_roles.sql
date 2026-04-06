-- Ensure expert profiles always reference real auth users.
DELETE FROM public.expert_profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Backfill missing expert roles so admin filtering by "Expert" is complete.
INSERT INTO public.user_roles (user_id, role)
SELECT ep.user_id, 'expert'::public.app_role
FROM public.expert_profiles ep
JOIN auth.users u ON u.id = ep.user_id
LEFT JOIN public.user_roles ur
  ON ur.user_id = ep.user_id
 AND ur.role = 'expert'::public.app_role
WHERE ur.id IS NULL;

-- Enforce referential integrity for future expert profile rows.
ALTER TABLE public.expert_profiles
DROP CONSTRAINT IF EXISTS expert_profiles_user_id_fkey,
ADD CONSTRAINT expert_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

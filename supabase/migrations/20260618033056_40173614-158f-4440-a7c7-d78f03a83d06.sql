create or replace view public.top_expert_profiles as
select
    id,
    full_name,
    job_title,
    area_of_expertise,
    profile_views,
    profile_completeness
from public.expert_profiles
order by profile_views desc
limit 10;

grant select on public.top_expert_profiles to authenticated;
grant select on public.top_expert_profiles to service_role;
DROP VIEW IF EXISTS top_expert_profiles;

CREATE VIEW top_expert_profiles AS
SELECT id,
    full_name,
    job_title,
    area_of_expertise,
    industry,
    profile_views,
    profile_completeness
FROM expert_profiles
ORDER BY profile_views DESC
LIMIT 10;
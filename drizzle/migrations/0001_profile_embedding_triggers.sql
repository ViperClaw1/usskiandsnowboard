-- Queue embedding generation whenever a profile's matching-relevant fields change.
-- Calls the profile-embedding-sync edge function asynchronously via pg_net (service-role bearer).

create or replace function public.queue_athlete_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  supabase_url text;
  supabase_service_key text;
  meaningful_change boolean;
begin
  if tg_op = 'UPDATE' then
    meaningful_change :=
      (new.bio is distinct from old.bio)
      or (new.sport_discipline is distinct from old.sport_discipline)
      or (new.career_interests is distinct from old.career_interests)
      or (new.skills is distinct from old.skills)
      or (new.professional_highlights is distinct from old.professional_highlights)
      or (new.geographic_preferences is distinct from old.geographic_preferences)
      or (new.sponsors is distinct from old.sponsors)
      or (new.home_mountain is distinct from old.home_mountain)
      or (new.availability is distinct from old.availability)
      or (new.is_public is distinct from old.is_public);
    if not meaningful_change then
      return new;
    end if;
  end if;

  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  if supabase_url is null then
    supabase_url := 'https://fihcubajfjjbcjqiqqrv.supabase.co';
  end if;

  perform net.http_post(
    url := supabase_url || '/functions/v1/profile-embedding-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_service_key
    ),
    body := jsonb_build_object('profile_id', new.id, 'role', 'athlete')
  );

  return new;
end;
$$;

create or replace function public.queue_expert_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  supabase_url text;
  supabase_service_key text;
  meaningful_change boolean;
begin
  if tg_op = 'UPDATE' then
    meaningful_change :=
      (new.full_name is distinct from old.full_name)
      or (new.job_title is distinct from old.job_title)
      or (new.company_name is distinct from old.company_name)
      or (new.area_of_expertise is distinct from old.area_of_expertise)
      or (new.industry is distinct from old.industry)
      or (new.bio is distinct from old.bio)
      or (new.ussa_affiliate is distinct from old.ussa_affiliate)
      or (new.is_public is distinct from old.is_public);
    if not meaningful_change then
      return new;
    end if;
  end if;

  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  if supabase_url is null then
    supabase_url := 'https://fihcubajfjjbcjqiqqrv.supabase.co';
  end if;

  perform net.http_post(
    url := supabase_url || '/functions/v1/profile-embedding-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_service_key
    ),
    body := jsonb_build_object('profile_id', new.id, 'role', 'expert')
  );

  return new;
end;
$$;

drop trigger if exists queue_athlete_embedding on public.athlete_profiles;
create trigger queue_athlete_embedding
  after insert or update on public.athlete_profiles
  for each row execute function public.queue_athlete_embedding();

drop trigger if exists queue_expert_embedding on public.expert_profiles;
create trigger queue_expert_embedding
  after insert or update on public.expert_profiles
  for each row execute function public.queue_expert_embedding();

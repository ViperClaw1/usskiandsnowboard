-- Enable pgvector for semantic profile matching
create extension if not exists vector;

-- Store one embedding per athlete/expert profile, refreshed on save.
create table public.profile_embeddings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique,
  role text not null check (role in ('athlete','expert')),
  content text not null,
  embedding vector(3072) not null,
  model text not null default 'google/gemini-embedding-2',
  updated_at timestamptz not null default now()
);

-- RLS: no client policies — only service role (edge functions) may access.
alter table public.profile_embeddings enable row level security;
grant all on public.profile_embeddings to service_role;

-- HNSW index on the halfvec cast (pgvector caps vector index at 2000 dims).
create index profile_embeddings_embedding_idx
  on public.profile_embeddings using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Rank experts for a given athlete by cosine similarity.
create or replace function public.match_experts_for_athlete(
  _athlete_profile_id uuid,
  _match_count integer default 8
)
returns table (
  expert_profile_id uuid,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id as expert_profile_id,
    1 - (pe.embedding::halfvec(3072) <=> ae.embedding::halfvec(3072)) as similarity
  from profile_embeddings ae
  join profile_embeddings pe
    on pe.role = 'expert' and pe.profile_id <> ae.profile_id
  join expert_profiles e on e.id = pe.profile_id
  where ae.profile_id = _athlete_profile_id
    and ae.role = 'athlete'
    and e.is_public = true
  order by pe.embedding::halfvec(3072) <=> ae.embedding::halfvec(3072)
  limit _match_count;
$$;

-- Rank athletes for a given expert by cosine similarity.
create or replace function public.match_athletes_for_expert(
  _expert_profile_id uuid,
  _match_count integer default 8
)
returns table (
  athlete_profile_id uuid,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id as athlete_profile_id,
    1 - (pe.embedding::halfvec(3072) <=> xe.embedding::halfvec(3072)) as similarity
  from profile_embeddings xe
  join profile_embeddings pe
    on pe.role = 'athlete' and pe.profile_id <> xe.profile_id
  join athlete_profiles a on a.id = pe.profile_id
  where xe.profile_id = _expert_profile_id
    and xe.role = 'expert'
    and a.is_public = true
  order by pe.embedding::halfvec(3072) <=> xe.embedding::halfvec(3072)
  limit _match_count;
$$;

grant execute on function public.match_experts_for_athlete(uuid, integer) to authenticated;
grant execute on function public.match_athletes_for_expert(uuid, integer) to authenticated;

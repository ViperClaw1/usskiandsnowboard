# AI Enhancements Plan: Smart Matching + Richer Profile Fill

Two features: (1) embedding-powered connection suggestions for athletes and experts, (2) upgraded "Complete with AI" accuracy.

## Part 1 — Smart Connection Matching

### How it works
Store a semantic embedding of every athlete and expert profile, then rank matches by cosine similarity instead of today's keyword-overlap. Embeddings are computed only when a profile is saved, so browsing suggestions costs nothing at request time.

### Database (new migration)
- Enable `pgvector` extension.
- New table `profile_embeddings`: `profile_id uuid`, `role text` ('athlete' | 'expert'), `content text`, `embedding vector(3072)`, `model text`, `updated_at`.
- RLS enabled, **no client policies** — only the service role (edge functions) reads/writes it.
- SQL functions `match_experts_for_athlete` and `match_athletes_for_expert` (SECURITY DEFINER): given the caller's profile id, return ranked profile ids + similarity scores. Small dataset, so indexed cosine distance is plenty.

### New edge functions
- `update-profile-embedding` — auth-guarded; builds embedding text from the caller's profile (athlete: bio, sport disciplines, career interests, skills, highlights · expert: bio, job title, expertise, industry, company), calls the Lovable AI embeddings endpoint (`google/gemini-embedding-2`), upserts the vector. Called after profile save in onboarding and profile editing.
- One-time admin backfill of all existing public profiles after the migration ships.

### Frontend
- **AthleteLandingPage** — new "Suggested Experts for You" section (above Featured Experts, same card grid + detail dialog). Calls `match_experts_for_athlete`, then renders profiles with a small match-strength badge. Existing keyword-scoring in `fetchFeaturedExperts` becomes the fallback when no embedding exists yet.
- **ExpertLandingPage** — new "Athletes to Mentor" section, same pattern (the expert page currently has no matching at all).
- **Connection dialog** (`ExpertConnectionRequestDialog`) — when opened from a suggestion card, shows a one-line "Why we suggested this" note derived from the shared interest signals.

## Part 2 — Richer AI Profile Fill (`ai-populate-profile`)

- **Model upgrade**: primary model becomes `openai/gpt-6-astra` (reasoning low, no temperature — this model's requirements), keeping fast Gemini fallbacks for rate-limit recovery.
- **Stronger identity guardrails in the system prompt**: only extract facts corroborated by at least one source that matches the person's name/company/discipline; leave fields empty rather than guessing; ignore namesakes. Directly addresses the "pulls irrelevant info" problem.
- **More sources**:
  - Athletes: additional Firecrawl searches for competition results and team/roster mentions (e.g. `"name" results`, `"name" "U.S. Ski & Snowboard" team`), scrape the top 2–3 most relevant hits.
  - Experts: additional searches for news mentions and industry/conference appearances alongside the current LinkedIn + company-site scrape.
- **Bug fix**: `upsertExpertProfile` never writes the AI-derived `industry` to `expert_profiles` — add it (the edge function already normalizes it against the approved industry list).

## Out of scope
- AI job-fit summaries and semantic search (deferred — can follow later).

## Verification
- Test embedding generation + match ranking with real athlete/expert accounts.
- Run Complete-with-AI for an athlete (name + discipline + Instagram) and an expert (name + company + LinkedIn) and inspect the extracted fields and sources used.

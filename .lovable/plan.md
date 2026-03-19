
## Two issues, one root cause

### Issue 1: Empty athlete array for logged-out users (the real problem)

**Root cause — RLS policy gap on `athlete_profiles`.**

`employer_profiles` has a policy `"Public can view all employer profiles"` with `qual: true` — no auth required. `athlete_profiles` has **no equivalent policy**. Every SELECT policy requires either `auth.uid() IS NOT NULL` or a specific role. An anonymous (logged-out) Supabase client gets zero rows back.

Fix: add a single new RLS policy:
```sql
CREATE POLICY "Public can view public athlete profiles"
ON public.athlete_profiles
FOR SELECT
TO public
USING (is_public = true);
```

The `profiles` table already has `"Public can view names for public athletes"` which allows anonymous reads for profiles linked to public athletes — so the `profiles!inner(full_name)` join in the query will work once athlete_profiles allows the read.

### Issue 2: Overlay position (caused by Issue 1)

The structure of both pages is **identical** — `relative` on `<section>`, `absolute inset-0` on the overlay div. The overlay appears at the top only because the section collapses to near-zero height when the card grid is empty (no athletes = nothing to fill the section). Once the RLS fix populates the 3 athlete cards, the section gets the same natural height as Employers and the overlay centres correctly — no JSX change needed.

### Changes

**1. Database migration** — add public SELECT policy to `athlete_profiles`:
```sql
CREATE POLICY "Public can view public athlete profiles"
ON public.athlete_profiles
FOR SELECT
TO public
USING (is_public = true);
```

**2. No JSX changes needed** in `Athletes.tsx` — the layout already mirrors `Employers.tsx`. The visual fix comes automatically once athletes are returned to anonymous users.

### Files changed
- New migration file only (`supabase/migrations/`)

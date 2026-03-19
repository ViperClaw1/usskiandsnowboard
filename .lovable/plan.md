
## Root cause

Athletes have **no UPDATE RLS policy** on `employer_profiles`. The direct `.update()` call in the card's `onClick` handler silently returns success (0 rows affected) — Supabase never throws when RLS blocks a write.

Adding a blanket UPDATE policy for athletes on `employer_profiles` would be too permissive (athletes could overwrite company data). The correct fix is a **`SECURITY DEFINER` database function** that only increments the `profile_views` counter — the function runs as the DB owner and bypasses RLS entirely, while the client has no new UPDATE privileges.

## Changes

### 1. Database migration — new `increment_employer_profile_views` function

```sql
CREATE OR REPLACE FUNCTION public.increment_employer_profile_views(employer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employer_profiles
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = employer_profile_id;
END;
$$;
```

### 2. `src/components/athlete/EmployerDirectory.tsx` — call RPC instead of direct update

Replace the `.update()` call in the card `onClick` with `supabase.rpc(...)`:

```tsx
// Before (silently blocked by RLS):
await supabase
  .from("employer_profiles")
  .update({ profile_views: (employer.profile_views || 0) + 1 })
  .eq("id", employer.id);

// After (runs via SECURITY DEFINER function):
await supabase.rpc("increment_employer_profile_views", {
  employer_profile_id: employer.id,
});
```

### Files changed
- New migration file in `supabase/migrations/`
- `src/components/athlete/EmployerDirectory.tsx` — one line change in the `onClick` handler

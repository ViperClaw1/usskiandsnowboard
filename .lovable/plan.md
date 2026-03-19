
## Root cause

In `src/components/athlete/EmployerDirectory.tsx` (line 538), clicking an employer card only calls `setSelectedEmployer(employer)`. There is **no** `profile_views` increment — unlike `src/components/employer/AthleteDirectory.tsx` (line 602–608) which increments athlete `profile_views` on every card click.

The `EmployerProfile` interface in `EmployerDirectory.tsx` also doesn't include a `profile_views` field, so we need to add it to the select query and interface too.

### Change — `src/components/athlete/EmployerDirectory.tsx`

1. **Add `profile_views` to the `EmployerProfile` interface** (after `job_board_url`):
   ```ts
   profile_views: number | null;
   ```

2. **Add `profile_views` to the `fetchDirectoryEmployers` select query** so the value is available on click.

3. **Convert the card's `onClick` to `async`** and increment `profile_views` when an employer card is clicked — exactly mirroring the athlete directory pattern:
   ```tsx
   onClick={async () => {
     setSelectedEmployer(employer);
     try {
       await supabase
         .from("employer_profiles")
         .update({ profile_views: (employer.profile_views || 0) + 1 })
         .eq("id", employer.id);
     } catch (error) {
       console.error("Error tracking view:", error);
     }
   }}
   ```

### Files changed
- `src/components/athlete/EmployerDirectory.tsx` only



## Fix: RLS Violation on `profiles` Table During Employer AI Auto-Fill

### Problem
The `ensureProfileRow` function (added in the last diff) tries to INSERT into the `profiles` table from the client side. However, the `profiles` table has **no INSERT RLS policy** for authenticated users — profile rows are created exclusively by the `handle_new_user` database trigger (which uses `SECURITY DEFINER` to bypass RLS). Every signed-up user already has a `profiles` row, so this guard is unnecessary and causes the `42501` error.

### Fix

**File: `src/services/profileUpsertService.ts`**

1. **Remove** the entire `ensureProfileRow` function (lines 22–49)
2. **Remove** the `await ensureProfileRow(userId, profileData.company_name);` call inside `upsertEmployerProfile` (line 77)

No other changes needed — the athlete and expert flows don't call `ensureProfileRow`, so they are unaffected. The athlete flow uses `profiles.update()` (which has a valid UPDATE policy), and the expert flow only touches `expert_profiles`.

### Verification
- Employer AI auto-fill: will no longer attempt a `profiles` INSERT, so the RLS error is eliminated
- Athlete AI auto-fill: only calls `profiles.update()` — valid UPDATE policy exists (`auth.uid() = id`)
- Expert AI auto-fill: only touches `expert_profiles` — valid ALL policy exists (`auth.uid() = user_id`)


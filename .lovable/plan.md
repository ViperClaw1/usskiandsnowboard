
## Plan: Fix MultiSelect width + instant completeness after onboarding

### Issue 1 — MultiSelect not filling full width (Steps 10, 11, 14)

**Root cause**: cmdk's `<Command>` component renders with its own internal wrapper div that wraps `<CommandInput>` in a `cmdk-input-wrapper` element styled with `display: flex` but no explicit `width: 100%`. Combined with the outer flex row (badges + input), the input shrinks and doesn't reach the container edge.

**Fix in `src/components/ui/multi-select.tsx`**:
- Add `w-full` to the `<Command>` root className (alongside `overflow-visible bg-transparent`)
- Add `w-full` to the inner flex container `div` (the `group rounded-md border...` div)
- Add `w-full min-w-0` to the `CommandInput` wrapper portion — specifically override the cmdk input wrapper by adding a class that forces it to take up remaining space
- The `<CommandInput>` already has `flex-1` but the cmdk parent `[cmdk-input-wrapper]` may constrain it — add `className` override to ensure the search element fills remaining space

The concrete change: the wrapping `<div className="flex flex-wrap gap-1">` should use `w-full`, and the `CommandInput` needs `w-full` on its container. Since cmdk `CommandInput` renders its own wrapper, we target it via the `className` on `CommandInput` to ensure `flex: 1 1 0%` and `min-width: 0`.

### Issue 2 — Profile completeness not updating instantly after wizard completion

**Root cause**: Two separate query keys exist:
- `AthleteDashboard` uses `["athlete-dashboard-profile", userId]` → invalidated by `invalidateProfile()`  
- `AthleteLandingPage` uses `["athlete-landing-dashboard", userId]` → **NOT invalidated** on wizard completion

When `AthleteOnboardingWizard.onComplete()` is called → `handleProfileComplete()` in `AthleteDashboard` runs → only invalidates `athlete-dashboard-profile` → `AthleteLandingPage`'s cached dashboard data (which holds `profile_completeness`) stays stale until its own 5-minute stale time expires.

**Fix in `src/components/dashboard/AthleteDashboard.tsx`**:

In `handleProfileComplete`, also invalidate the landing page query:
```typescript
const handleProfileComplete = () => {
  setShowProfileDialog(false);
  queryClient.invalidateQueries({ queryKey: athleteProfileKey(user.id) });
  queryClient.invalidateQueries({ queryKey: ["athlete-landing-dashboard", user.id] });
  toast.success("Profile updated successfully!");
};
```

Since `athleteDashboardKey` is defined inside `AthleteLandingPage.tsx` (not exported), the string array `["athlete-landing-dashboard", user.id]` must be used directly, or the key should be exported from `AthleteLandingPage.tsx` and imported in `AthleteDashboard.tsx`.

**Cleanest approach**: Export `athleteDashboardKey` from `AthleteLandingPage.tsx` and import it in `AthleteDashboard.tsx` to avoid hardcoding string arrays in multiple places.

---

### Files to change

1. **`src/components/ui/multi-select.tsx`**  
   - Add `w-full` to the `<Command>` className  
   - Add `w-full` to the border-wrapper div  
   - Add `w-full` to the `flex flex-wrap gap-1` div  

2. **`src/components/dashboard/athlete/AthleteLandingPage.tsx`**  
   - Export `athleteDashboardKey` so it can be imported elsewhere  

3. **`src/components/dashboard/AthleteDashboard.tsx`**  
   - Import `athleteDashboardKey` from `AthleteLandingPage.tsx`  
   - In `handleProfileComplete`, add `queryClient.invalidateQueries({ queryKey: athleteDashboardKey(user.id) })` alongside the existing profile key invalidation  

No DB migrations, no new dependencies.

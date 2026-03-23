
## Fix: Profile completeness not refreshing after AI or manual population

### Root cause analysis

There are two distinct gaps:

**Gap 1 — AI path (`Dashboard.tsx`)**
`AIProfilePopulator.onComplete` fires `setRefreshKey((k) => k + 1)`, which force-remounts the entire child dashboard. On remount, `AthleteLandingPage` and `PartnerLandingPage` each call `useQuery` with `initialData: () => queryClient.getQueryData(...)` — this reads the **stale cached value** synchronously instead of fetching fresh data. Result: the completeness card still shows the old number until the 5-minute stale window expires.

**Gap 2 — Employer manual path (`EmployerDashboard.tsx`)**
`handleProfileComplete` invalidates `employerProfileKey` but never invalidates `partnerDashboardKey` (the query powering `PartnerLandingPage`). So the landing page completeness card doesn't update after the wizard or form completes.

### Fix — 3 targeted changes

#### 1. `src/pages/Dashboard.tsx`
Export `partnerDashboardKey` from `PartnerLandingPage` (or re-import it), then in `AIProfilePopulator.onComplete` **also invalidate both landing-page dashboard queries** before incrementing refreshKey — so when the child remounts, `initialData` finds no stale cache and triggers a real fetch:

```ts
onComplete={() => {
  setShowAIPopulator(false);
  // Bust landing-page caches so remounted children fetch fresh data
  queryClient.invalidateQueries({ queryKey: ["athlete-landing-dashboard", user.id] });
  queryClient.invalidateQueries({ queryKey: ["partner-landing-dashboard", user.id] });
  setRefreshKey((k) => k + 1);
}}
```

#### 2. `src/components/dashboard/employer/PartnerLandingPage.tsx`
Export `partnerDashboardKey` so it can be referenced externally (same pattern as `athleteDashboardKey` already exported from `AthleteLandingPage`):
```ts
export const partnerDashboardKey = (userId: string) => ["partner-landing-dashboard", userId];
```

#### 3. `src/components/dashboard/EmployerDashboard.tsx`
Import `partnerDashboardKey` and add it to `handleProfileComplete`:
```ts
import { PartnerLandingPage, partnerDashboardKey } from "@/components/dashboard/employer/PartnerLandingPage";

const handleProfileComplete = () => {
  setShowProfileDialog(false);
  invalidateProfile();
  queryClient.invalidateQueries({ queryKey: partnerDashboardKey(user.id) }); // ← add this
  onProfileUpdated?.();
  toast.success("Profile updated successfully!");
};
```

Similarly in `AthleteDashboard.tsx`, `handleProfileComplete` already calls `invalidateQueries({ queryKey: athleteDashboardKey(user.id) })` — this is correct and no change needed there.

### Summary of all invalidations after this fix

| Trigger | Queries invalidated |
|---|---|
| AI completes (athlete) | `athleteProfileKey` + `athleteDashboardKey` + remount |
| AI completes (employer) | `employerProfileKey` + `partnerDashboardKey` + remount |
| Manual wizard/form (athlete) | `athleteProfileKey` + `athleteDashboardKey` ✓ already correct |
| Manual wizard/form (employer) | `employerProfileKey` + `partnerDashboardKey` ← **gap fixed** |

### Files to change
1. `src/components/dashboard/employer/PartnerLandingPage.tsx` — export `partnerDashboardKey`
2. `src/components/dashboard/EmployerDashboard.tsx` — import and invalidate `partnerDashboardKey` in `handleProfileComplete`
3. `src/pages/Dashboard.tsx` — invalidate both landing-page queries inside `AIProfilePopulator.onComplete` before the refreshKey bump

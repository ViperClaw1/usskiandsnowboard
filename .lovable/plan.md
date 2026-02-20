

# Profile Re-render After AI Auto-Population

## Problem

When the AI Profile Populator finishes extracting data, the dashboard components don't refresh. This happens in two scenarios:

1. **Welcome popup flow** (invited users): The `onComplete` callback in `Dashboard.tsx` only hides the populator -- it never tells `AthleteDashboard` or `EmployerDashboard` to reload their profile data.

2. **Inline AI populator** (on landing pages): This already works because `onComplete` calls `loadDashboardData()` directly. However, the parent `AthleteDashboard`/`EmployerDashboard` profile state (used for the edit dialog and portfolio view) is not refreshed.

## Solution

Use a simple `refreshKey` counter pattern: increment it whenever the AI populator completes, and pass it as a `key` prop to the dashboard component so it fully re-mounts and re-fetches all data.

### Changes

**1. `src/pages/Dashboard.tsx`**
- Add a `refreshKey` state counter (starts at 0)
- In the welcome popup's `onComplete`, increment `refreshKey`
- Pass `key={refreshKey}` to `AthleteDashboard` and `EmployerDashboard` so they re-mount and re-fetch everything

**2. `src/components/dashboard/AthleteDashboard.tsx`**
- Accept an optional `onProfileUpdated` callback prop
- Add a `refreshKey` state that increments when profile data changes
- Pass `onProfileUpdated` through to `AthleteLandingPage` so when the inline AI populator completes, it calls both `loadDashboardData()` (landing page internal) and `loadProfile()` (dashboard level)

**3. `src/components/dashboard/EmployerDashboard.tsx`**
- Same pattern: accept optional `onProfileUpdated` and ensure `loadProfile()` is called after AI completion via the `PartnerLandingPage` callback chain

**4. `src/components/profile/AIProfilePopulator.tsx`**
- After the successful database upsert and before calling `onComplete()`, add a small delay (the existing 1500ms is already there) to ensure the DB trigger for employer completeness has fired
- No structural changes needed -- `onComplete` is already called at the right time

## Technical Details

The key insight is that `Dashboard.tsx` renders `AthleteDashboard`/`EmployerDashboard` which each have their own `loadProfile()`. When the welcome popup's AI populator finishes, we need those components to re-fetch. The cleanest approach:

```text
Dashboard.tsx
  |-- refreshKey state (incremented on AI complete)
  |-- <AthleteDashboard key={refreshKey} />
       |-- loadProfile() runs on mount (triggered by key change)
       |-- <AthleteLandingPage onProfileUpdated={loadProfile} />
            |-- <AIProfilePopulator onComplete={loadDashboardData + onProfileUpdated} />
```

This ensures both the welcome popup flow and the inline populator flow result in full data refresh across all components.

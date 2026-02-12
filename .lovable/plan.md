

# Fix: "Failed to load profile" Toast Errors on Admin Dashboard

## Root Cause

The Admin Dashboard renders three tabs: Analytics, Athlete View, and Partner View. The Athlete/Partner View tabs pass **fake non-UUID user IDs** (`blank-athlete-preview`, `blank-employer-preview`) to `AthleteDashboard` and `EmployerDashboard`.

The problem is that Radix `TabsContent` mounts all tab panels by default. So even when viewing the Analytics tab, both dashboard components mount and call `loadProfile()` with these invalid IDs. The database rejects them (invalid UUID syntax), retries 3 times, then shows `toast.error("Failed to load profile. Please refresh the page.")`.

## Solution

**Skip the profile load when in admin preview mode.** Both `AthleteDashboard` and `EmployerDashboard` already accept an `isAdminView` prop. We just need to use it:

### File: `src/components/dashboard/AthleteDashboard.tsx`

- In the `loadProfile` function (called inside `useEffect`), check `isAdminView` first
- If `isAdminView` is true, skip the Supabase query entirely, set `profile` to `null`, set `loading` to `false`, and return
- This prevents the invalid UUID query and eliminates the error toast

### File: `src/components/dashboard/EmployerDashboard.tsx`

- Same change: if `isAdminView` is true, skip the profile load, set `loading` to `false`, and return early

## What This Fixes

- Removes the 3x "Failed to load profile" toast errors that appear after login for admin users
- Eliminates the 400 error network requests with invalid UUIDs
- The QA preview tabs still work correctly (they show the blank/new-user experience as intended)

## What Stays the Same

- Admin Dashboard layout and tab structure -- no changes
- Athlete/Partner dashboards for actual athletes/partners -- no changes
- Profile loading for real users -- no changes


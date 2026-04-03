

## Plan: Fix AI Profile Auto-Fill Image Upload and Post-Completion Dialog

### Problem Summary
1. **Photo URLs not rendering**: AI extracts external image URLs (e.g., from Instagram/LinkedIn/websites) but stores them directly. These external URLs often fail to load due to CORS, hotlinking protection, or expiration.
2. **Dialog shows "Complete Your Profile" choice instead of edit form**: After AI auto-fill creates the profile, the `refreshKey` increment triggers a re-mount. However, each dashboard component checks `profile ? <EditForm> : <ChoiceDialog>`. The `useQuery` cache may not yet have the new profile when the dialog opens, so it shows the choice dialog.

### Solution

#### 1. Download and re-upload external images to Supabase Storage (profileUpsertService.ts)

Add a helper function `uploadExternalImage(userId, externalUrl, bucket)` that:
- Fetches the external image via `fetch()`
- Uploads it to the appropriate Supabase storage bucket (`athlete-photos`, `company-logos`, or `expert-photos`)
- Returns the Supabase public URL
- Falls back to `null` if the fetch/upload fails (non-blocking)

Call this helper in each upsert function:
- `upsertAthleteProfile`: upload `profileData.photo_url` to `athlete-photos` bucket, store result in `athleteFields.photo_url`
- `upsertEmployerProfile`: upload `profileData.logo_url` to `company-logos` bucket, store result in `employerFields.logo_url`
- `upsertExpertProfile`: upload `profileData.photo_url` to `expert-photos` bucket, store result in `expertFields.photo_url`

#### 2. Fix post-AI dialog behavior (AthleteDashboard, EmployerDashboard, ExpertDashboard)

The issue: after AI auto-fill completes, the `onComplete` callback in `Dashboard.tsx` increments `refreshKey`, causing the dashboard to remount. But when the user later clicks "Edit Profile" or the pen icon, the dialog still checks `profile ? <EditForm> : <ChoiceDialog>`.

Since AI auto-fill creates/updates the profile, the query cache should have data. The fix is to ensure query invalidation happens before the dashboard remounts. In `Dashboard.tsx`'s `AIProfilePopulator.onComplete`:
- Also invalidate the per-role profile query keys (`athleteProfileKey`, `employerProfileKey`, `expert-own-profile`) so the re-mounted dashboard fetches fresh data immediately.

Additionally, in each dashboard's `openProfileDialog` effect, when the profile already exists, set `dialogStep` to skip the choice dialog:
- **ExpertDashboard** (line 78-84): When `openProfileDialog` fires, check if profile exists and set `dialogStep` to `"manual"` instead of `"choice"`
- **AthleteDashboard** and **EmployerDashboard** already handle this correctly via `profile ? <EditForm> : <ChoiceDialog>` — the issue is stale cache, so invalidation fixes it.

### Files Modified
- `src/services/profileUpsertService.ts` — add `uploadExternalImage` helper, call it in all three upsert functions
- `src/pages/Dashboard.tsx` — invalidate role-specific profile query keys in AI populator's `onComplete`
- `src/components/dashboard/ExpertDashboard.tsx` — fix `openProfileDialog` effect to set `dialogStep = "manual"` when profile exists


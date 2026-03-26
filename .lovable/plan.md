
## Expert Dashboard — Match Partner Dashboard UI

The `ExpertLandingPage` component already has all the right sections (hero, 3 stat cards, Featured Athletes, Featured Partners) but differs from the Partner dashboard in these specific ways that need fixing:

### What's different / needs to change

**1. Hero background — no upload functionality**
The Expert hero uses a static non-interactive `<div>` with a `Pencil` icon button for profile edit. The Partner dashboard has:
- A hidden `<input ref={bgInputRef}>` for file upload
- Clickable "Add background photo" text/icon that opens the file picker
- A "Change photo" button overlay when a bg image exists
- `uploadingBg` state + `handleBgUpload` async handler that uploads to Supabase storage and updates `expert_profiles.background_image_url`

**2. Hero — missing `AIProfilePopulator` in completeness card**
The Partner's completeness card has a "Complete with AI" button (`<AIProfilePopulator role="employer" ...>`). The Expert's version is missing this. Need to add `<AIProfilePopulator role="expert" userId={user.id} onComplete={...} />`.

**3. Hero — profile info block missing `job_title` display**
The Expert shows `disciplinePreview` (first part of `area_of_expertise`) as subtitle. Should show `profile.job_title` as the subtitle line (matching how Partner shows `profile.industry`), and separately show area of expertise as a badge or secondary line.

**4. Pencil edit button — should be blue-pencil-less**
Partner dashboard shows a plain `<Pencil>` icon (no `text-blue-500`). Minor visual consistency fix.

**5. Expert profile has `background_image_url` field** — the DB column exists (it's in the migration), so the upload flow will work.

### Files to change

#### `src/components/dashboard/expert/ExpertLandingPage.tsx`
- Add `useRef`, `useState` for `bgInputRef` / `uploadingBg` / `localBgUrl`
- Add `handleBgUpload` function (same pattern as `PartnerLandingPage` — uploads to `expert-photos` or `company-logos` bucket, updates `expert_profiles.background_image_url`)
- Replace the static background `<div>` with the interactive upload button (same markup as Partner)
- Add "Change photo" overlay when bg image exists
- Remove `text-blue-500` from the Pencil icon in edit button
- Add `<AIProfilePopulator role="expert" userId={user.id} onComplete={...} />` inside the completeness card below the "Complete your profile" link
- Change the subtitle under the name from `disciplinePreview` to `profile.job_title` (show job title, which is the primary descriptor)
- Add `Loader2` to the import list (needed for the upload spinner)

### Storage bucket note
The upload will use the existing `company-logos` bucket (already exists and is public) so no new bucket migration is needed. The path will be `expert-bg/${user.id}/bg-${timestamp}.${ext}`.

### No changes needed to
- `ExpertDashboard.tsx` — it correctly wraps `ExpertLandingPage` and passes all props
- The 3 stat cards, Featured Athletes/Partners sections — already match the Partner layout
- Quick Actions — already structured correctly with the right buttons

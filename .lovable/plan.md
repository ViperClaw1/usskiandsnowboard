
## Full Plan

### What needs to be built

**4 coordinated changes:**
1. DB migration — add `background_image_url` to both `athlete_profiles` and `employer_profiles`
2. Onboarding wizards — optional background image step (athlete + employer), default to `us-background-mountain.png` on submit if blank
3. Edit profile dialogs — background image uploader with delete, before profile photo, default on delete
4. Mobile layout — avatar center sits exactly on top border of the white info block (`-mt-12` on the Avatar so its center aligns with the container top)

---

### 1. DB Migration

```sql
ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS background_image_url text;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS background_image_url text;
```

No RLS changes needed — both tables already have existing policies covering the new column.

---

### 2. Storage

Background images for both athletes and employers can reuse the existing `athlete-photos` bucket (for athletes) and `company-logos` bucket (for employers) — both are public. No new bucket needed. Files stored at `{userId}/bg-{timestamp}.{ext}`.

---

### 3. Onboarding Wizards

**`AthleteOnboardingWizard.tsx`**
- Add `backgroundImageUrl` state (string, default `""`).
- Insert a new step **after the profile photo step (case 1)** — step index 2 becomes "Background Image" (optional). Increment `TOTAL_STEPS` from 15 to 16. Shift all subsequent `case` numbers by 1.
- In `canGoNext`, new case 2 returns `true` (optional).
- In `onSubmit`, pass `background_image_url: backgroundImageUrl || null` to the upsert. No default image is stored in DB — the default asset is applied at render time when the value is null.

**`EmployerOnboardingWizard.tsx`**
- Add `backgroundImageUrl` state (string, default `""`).
- Insert a new optional step after the logo step (case 1 → new case 2 = "Background Image"). Increment `TOTAL_STEPS` from 11 to 12. Shift cases.
- In `onSubmit`, pass `background_image_url: backgroundImageUrl || null`.

Both steps share the same upload pattern: use `athlete-photos` / `company-logos` bucket respectively, `{userId}/bg-{timestamp}.{ext}` path, preview image with remove button, `StepNavigation` with `onSkip`.

---

### 4. Profile Edit Forms

**`ProfileForm.tsx` (Athlete)**
- Add `backgroundImageUrl` state, loaded from `athleteData.background_image_url`.
- Add `backgroundImageFile` state + uploader function.
- Before the existing "Profile Photo" section, add a **"Background Image"** section with:
  - If set: preview (wide, `h-32 object-cover rounded-lg`) + "Change" + "Remove" (X) button
  - If not set: upload area
  - On remove: `setBackgroundImageUrl("")` — the dashboard renders the default asset when null
- In `handleSubmit`, include `background_image_url: backgroundImageUrl || null` in the upsert.

**`CompanyProfileForm.tsx` (Employer)**
- Add `backgroundImageUrl` state from `existingProfile?.background_image_url`.
- Add background image uploader section before the logo avatar section (same pattern as athlete).
- In `onSubmit`, include `background_image_url: backgroundImageUrl ? backgroundImageUrl.split('?')[0] : null`.

---

### 5. Dashboard Landing Pages (background image display)

**`AthleteLandingPage.tsx`**
- The banner `<div>` currently uses `profile?.hero_image_url` for the background style. Change to use `profile?.background_image_url`. If null, fall back to `us-background-mountain.png` (imported as ES6 module).
- Add `background_image_url` to the `AthleteProfile` interface and the `select` query (`"*, profiles(...)"` already returns all columns).

**`PartnerLandingPage.tsx`**
- The banner `<div>` currently uses only a gradient. Change to:
  - If `profile?.background_image_url` → background image
  - Else → import and use `us-background-mountain.png` asset
- Add `background_image_url` to the `EmployerProfile` interface and to the `select` string in `fetchPartnerDashboard`.

---

### 6. Mobile Avatar Fix (point 4)

The screenshot shows the avatar should be half-inside the banner and half-inside the white info block — its center sits exactly on the container's top border.

**Current state** (`AthleteLandingPage.tsx` + `PartnerLandingPage.tsx`):
```
<div className="-mt-16 sm:mt-0 ...">          ← info block pulled up by 64px
  <div className="... bg-white rounded-t-xl">
    <Avatar className="h-24 w-24 ...">         ← 96px tall, so center is 48px down
```
The `-mt-16` (64px) pulls the whole white block up, but the avatar (h-24 = 96px) starts at the top of the white block. Its center is 48px into the white area, not on the border.

**Fix** — apply only to `< sm` (mobile):
```jsx
<Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg shrink-0
                   -mt-12 sm:mt-0">
```
`-mt-12` = -48px = exactly half of `h-24` (96px), so the avatar center lands on the white block's top border. `sm:mt-0` restores desktop behaviour unchanged.

The white info block pull-up stays at `-mt-16` (64px): the avatar's top edge (`-mt-12` + block's own padding) will sit within the banner overlap, and the center will be on the border.

---

### Files to change

```
supabase/migrations/          New migration: add background_image_url columns
src/components/athlete/AthleteOnboardingWizard.tsx   Add BG image step + submit
src/components/employer/EmployerOnboardingWizard.tsx Add BG image step + submit
src/components/athlete/ProfileForm.tsx               BG image uploader section
src/components/employer/CompanyProfileForm.tsx       BG image uploader section
src/components/dashboard/athlete/AthleteLandingPage.tsx  Use background_image_url (fallback to asset)
src/components/dashboard/employer/PartnerLandingPage.tsx Use background_image_url (fallback to asset)
```

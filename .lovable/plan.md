
## Background banners in profile dialogs — final plan

### Behaviour summary

Every profile dialog header gets a `h-28` background image banner. Avatar/logo straddles the banner's bottom edge (`absolute -bottom-8 left-6 h-16 w-16 border-4 border-background`). When `background_image_url` is null: show the gradient placeholder. When the viewer is the owner: show the "Add background photo" CTA inside the gradient and the "Change photo" pill when an image exists.

---

### Files to change (8)

#### 1. `src/components/profile/AthleteProfilePreview.tsx`
Add 3 optional props (`bgInputRef`, `onBgUpload`, `uploadingBg`). Replace the flat header block (lines 22–40) with:
- Outer `div relative -mx-6 -mt-6` flush to dialog edges
- Banner div `h-28` — either bg image or gradient + optional "Add background photo" CTA
- Optional "Change photo" pill `absolute top-2 left-2`
- Avatar `absolute -bottom-8 left-6 h-16 w-16 border-4 border-background shadow-lg`
- Name/sport in a `pt-10 pb-2 px-6` block below

Imports to add: `ImagePlus`, `Loader2`.

#### 2. `src/components/dashboard/athlete/AthleteLandingPage.tsx`
In the "Preview Profile" dialog (~line 526), pass the already-existing `bgInputRef`, `handleBgUpload`, `uploadingBg` to `<AthleteProfilePreview>` as upload props.

#### 3. `src/components/profile/EmployerProfilePreview.tsx`
Same 3 optional props. Replace the flat header block (lines 22–40) with the same banner + straddling-logo-avatar pattern. The rest of the component (Tabs, about section, etc.) stays unchanged but content gains `pt-10` clearance.

#### 4. `src/components/dashboard/EmployerDashboard.tsx`
Add `bgInputRef`, `uploadingBg` state, and `handleBgUpload` (upload to `company-logos` bucket, update `employer_profiles.background_image_url`, invalidate the employer profile query). Pass these to `<EmployerProfilePreview>` at line ~196. Imports: `useRef`, `useState`, `ImagePlus`, `Loader2`.

#### 5. `src/components/employer/AthleteDirectory.tsx`
- Add `background_image_url: string | null` to the `AthleteProfile` interface
- In the athlete detail dialog (~lines 730–750), replace the plain flex header with the display-only banner (gradient or image, no upload controls)

#### 6. `src/components/employer/ConnectionsList.tsx`
- Add `background_image_url: string | null` to the `Connection.athlete_profiles` nested interface
- Add `background_image_url` to the Supabase `.select()` around line 94
- In the dialog header (~lines 376–390), replace with the display-only banner

#### 7. `src/components/athlete/EmployerDirectory.tsx`
- Add `background_image_url: string | null` to `EmployerProfile` interface
- In the employer detail dialog (~lines 641–660), replace the plain flex header with display-only banner

#### 8. `src/components/athlete/ConnectionsList.tsx`
- Add `background_image_url: string | null` to the inline `employer_profiles` type inside `Connection`
- Add `background_image_url` to the Supabase `.select()` around line 80
- The `<EmployerProfilePreview>` used here (line 256) renders display-only automatically (no upload props passed) — covered by change 3

---

### No DB migrations needed

`background_image_url` already exists on both `athlete_profiles` and `employer_profiles`.

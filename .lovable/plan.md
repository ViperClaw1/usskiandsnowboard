

# Apply AI Profile Data to Frontend and Handle Incomplete Scrapes

## What This Fixes

**Problem 1**: After AI auto-populates a profile, clicking "Update Profile" or "Preview My Profile" shows stale/empty data because the parent dashboard components (AthleteDashboard, EmployerDashboard) don't reload their local `profile` state.

**Problem 2**: The AI populator hardcodes `profile_completeness: 100` for athletes even when some fields weren't found, giving a false sense of completion.

---

## Changes Overview

### 1. Refresh parent dashboard profile after AI completion

**Files**: `AthleteDashboard.tsx`, `EmployerDashboard.tsx`, `AthleteLandingPage.tsx`, `PartnerLandingPage.tsx`

Currently, the AI populator's `onComplete` only refreshes the landing page's local data. The parent dashboard holds a separate `profile` state used by the Edit Profile dialog and the Employer Preview page.

**Fix**: Pass a `onProfileUpdated` callback from the parent dashboards down to the landing pages. When the AI populator completes (or any profile update happens), both the landing page AND the parent dashboard refresh their profile data.

- `AthleteDashboard` will pass `loadProfile` as an `onProfileUpdated` prop to `AthleteLandingPage`
- `EmployerDashboard` will pass `loadProfile` as an `onProfileUpdated` prop to `PartnerLandingPage`
- The landing pages will call `onProfileUpdated()` alongside their own `loadDashboardData()` when the AI populator finishes

### 2. Calculate real profile completeness instead of hardcoding 100

**File**: `AIProfilePopulator.tsx`

Replace the hardcoded `profile_completeness: 100` with a calculation that mirrors the onboarding wizard's approach: count non-null/non-empty fields and compute a percentage. This way, if scraping missed some fields, the completeness reflects reality.

For athletes, the key fields considered:
- photo_url, sport_discipline, bio, career_interests, skills, availability, affiliation, home_mountain, instagram_url, sponsors, professional_highlights, email

For employers, the database trigger (`calculate_employer_profile_completeness`) already handles completeness automatically on insert/update, so no change needed there.

### 3. Employer Preview uses fresh data

**File**: `EmployerDashboard.tsx`

The employer "Preview My Profile" view renders `EmployerProfilePreview` with the dashboard's `profile` state, which currently only fetches a limited set of columns (`id, company_name, logo_url, industry, ...`). After the fix in item 1, `loadProfile` fetches all columns (`select("*")`), so the preview will have full data.

### 4. Ensure "Complete your profile" button and AI button remain visible when incomplete

No code change needed for this -- the existing `completeness < 100` check already controls visibility of the "Complete your profile" block and the AI populator button. With the real completeness calculation from item 2, these will correctly remain visible when some fields are missing.

When the user clicks "Complete your profile" after a partial AI fill:
- **Athletes**: The `ProfileForm` component runs `loadExistingProfile()` on mount, fetching all current data from the database. Fields populated by AI will appear as initial values. The user fills in the blanks manually.
- **Employers**: The `CompanyProfileForm` receives `existingProfile` as a prop. After fix 1, this prop will contain the AI-populated data. Missing fields show as empty inputs for the user to complete.

---

## Technical Details

### AthleteDashboard.tsx
- Add `onProfileUpdated` prop to `AthleteLandingPage` component call: `<AthleteLandingPage user={user} onNavigate={handleNavigate} onProfileUpdated={loadProfile} />`

### EmployerDashboard.tsx  
- Add `onProfileUpdated` prop to `PartnerLandingPage` component call: `<PartnerLandingPage user={user} onNavigate={handleNavigate} onProfileUpdated={loadProfile} />`

### AthleteLandingPage.tsx
- Add `onProfileUpdated?: () => void` to the `AthleteHomeProps` interface
- In the `AIProfilePopulator` `onComplete`, call both `loadDashboardData()` and `onProfileUpdated?.()`

### PartnerLandingPage.tsx
- Add `onProfileUpdated?: () => void` to the `PartnerLandingPageProps` interface
- In the `AIProfilePopulator` `onComplete`, call both `loadDashboardData()` and `onProfileUpdated?.()`

### AIProfilePopulator.tsx
- Replace `profile_completeness: 100` with a calculated value:
```typescript
const athleteFieldValues = Object.values(athleteFields);
const filledCount = athleteFieldValues.filter(v => 
  v !== null && v !== undefined && v !== "" && 
  !(Array.isArray(v) && v.length === 0)
).length;
const completeness = Math.round((filledCount / athleteFieldValues.length) * 100);
```
- Include `profile_completeness: completeness` instead of `profile_completeness: 100`


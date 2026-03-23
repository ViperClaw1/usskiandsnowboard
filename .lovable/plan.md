
## Replace first-login onboarding wizard with AI/Manual choice dialog

### Problem
When a new athlete or employer logs in for the first time (no profile exists), both `AthleteDashboard` and `EmployerDashboard` immediately open a dialog with the full onboarding wizard. The user wants the same **"Complete with AI" vs "Complete Manually"** choice screen shown first (like in the waitlist/auth flow), before entering any wizard.

### How it works today
- `AthleteDashboard` / `EmployerDashboard` detect `profile === null` on first load → set `showProfileDialog = true` → renders the `AthleteOnboardingWizard` / `EmployerOnboardingWizard` directly inside the dialog
- There is NO choice step in the dashboard path; the AI populator in `Dashboard.tsx` only fires via `localStorage.getItem("pending_ai_profile")` set from the invite flow

### Target behaviour
1. First login + no profile → open a **choice dialog** (not the wizard)
2. Choice dialog has: "Complete with AI" button + "Complete Manually" button + "Skip for now" ghost button
3. "Complete with AI" → closes choice dialog → opens the existing `AIProfilePopulator` dialog (already available in `Dashboard.tsx`)
4. "Complete Manually" → switches the dialog content from the choice screen to the onboarding wizard (same dialog, different step)
5. "Skip for now" → closes the dialog without action
6. When the dialog is opened from parent (e.g. user clicks "Edit Profile" from the landing page) with an existing profile → skip choice, go straight to the edit form (existing behaviour)

### Files to change (2)

#### 1. `src/components/dashboard/AthleteDashboard.tsx`
- Add a `onRequestAI?: () => void` optional prop
- Replace the `showProfileDialog` render logic: when `profile === null`, show a choice screen first with 3 buttons (AI / Manual / Skip) instead of jumping straight to `AthleteOnboardingWizard`
- "Complete with AI" button calls `onRequestAI?.()` and closes the dialog
- "Complete Manually" advances an internal `step` state from `"choice"` → `"wizard"`, showing `AthleteOnboardingWizard`
- "Skip for now" closes dialog
- When `profile` exists (edit mode), skip the choice and show `ProfileForm` directly (unchanged)

#### 2. `src/components/dashboard/EmployerDashboard.tsx`
- Same `onRequestAI?: () => void` prop
- Same pattern: choice screen → "Complete with AI" calls `onRequestAI?.()`, "Complete Manually" shows `EmployerOnboardingWizard`, "Skip for now" closes
- Edit mode (profile exists) stays unchanged → shows `CompanyProfileForm`

#### 3. `src/pages/Dashboard.tsx`
- Pass `onRequestAI` to both `AthleteDashboard` and `EmployerDashboard`:
  ```tsx
  onRequestAI={() => setShowAIPopulator(true)}
  ```
- This reuses the already-wired `AIProfilePopulator` logic in `Dashboard.tsx` (which already handles `showAIPopulator`, `onComplete`, `refreshKey`)
- No changes to the welcome popup logic or AI populator setup needed

### Choice dialog UI (inside the profile dialog when profile is null)
```
┌─────────────────────────────────────────────┐
│  ✨ Complete Your Profile                    │
│  Choose how you'd like to get started        │
│                                              │
│  [✨ Complete with AI]        (primary btn)  │
│  [📋 Complete Manually]       (outline btn)  │
│  [Skip for now]               (ghost btn)    │
└─────────────────────────────────────────────┘
```

### No DB or migration changes needed

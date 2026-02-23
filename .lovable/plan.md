
# Location Search Box + Re-rendering for Manual Profile Flow

## Overview

Two changes:
1. Replace the plain text input on the HQ Location step (step 5) of the Employer Onboarding Wizard with a searchable combobox featuring geographic address suggestions
2. Ensure the manual profile completion flow triggers the same re-rendering and profile completeness recalculation as the AI flow

## Changes

### 1. New Component: `src/components/ui/location-search.tsx`

Create a reusable `LocationSearch` combobox component using the existing `Command` (cmdk) primitives already in the project. It will:

- Accept `value`, `onValueChange`, `placeholder`, and `className` props
- Contain a curated list of ~50 major US cities/regions (e.g., "San Francisco, CA", "New York, NY", "Denver, CO", "Salt Lake City, UT", "Park City, UT", etc.) with emphasis on ski/snowboard-relevant locations
- Use a `Popover` + `Command` pattern: typing filters the list, clicking an option selects it
- Allow free-text entry so users aren't limited to the predefined list -- if they type something not in the list, it's accepted as-is
- Style it to match the existing onboarding inputs (h-14, text-lg, border-2)

### 2. Update: `src/components/employer/EmployerOnboardingWizard.tsx`

**Step 5 (case 5)**: Replace the plain `<Input>` with the new `<LocationSearch>` component:
- Wire it to `formValues.hqLocation` and `setValue("hqLocation", value)`
- Keep the same validation (non-empty string required to proceed)

### 3. Re-rendering (already working -- verification)

The re-rendering and profile completeness recalculation for the manual flow is already properly wired:

- **Employer Onboarding Wizard**: `onComplete()` calls `handleProfileComplete` in `EmployerDashboard`, which calls `loadProfile()` (re-fetches profile including DB-trigger-calculated `profile_completeness`) and `onProfileUpdated?.()` (propagates to `Dashboard.tsx` to increment `refreshKey`)
- **Company Profile Form** (edit mode): `onSuccess` callback follows the same path
- **DB trigger** `calculate_employer_profile_completeness` automatically recalculates completeness on every upsert/update to `employer_profiles`
- **Athlete Onboarding Wizard**: Calculates completeness client-side before upsert, then `onComplete()` triggers the same refresh chain

No additional code changes are needed for re-rendering -- the existing callback chain handles it.

## Technical Details

The `LocationSearch` component structure:
- Uses `Popover` from `@radix-ui/react-popover` (already installed)
- Uses `Command`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty` from cmdk (already installed)
- Curated city list stored as a constant array within the component
- Filter is handled by cmdk's built-in fuzzy matching
- Free-text fallback: if user presses Enter or clicks away with custom text, the typed value is accepted
- The popover gets `z-50` and `bg-popover` to avoid transparency issues per project conventions

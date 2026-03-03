
## Plan: AI Option in Profile-Data Step

### Current State
In `WaitlistProfileStep` (lines 548-572), the "choice" mode shows two buttons:
1. "Complete Manually" → goes to manual form
2. "Request Access (Skip Profile for Now)" → immediately calls `onRequestAccess({ ai_populate: true })`

### What Needs to Change
Replace the "Complete with AI" option so that instead of immediately submitting, it first shows a small form with role-specific URL fields, then calls the `ai-populate-profile` edge function, stores the extracted data, and finally lets the user submit.

### Implementation

**In `WaitlistProfileStep`**, add a new `mode` value: `"ai"` (alongside existing `"choice"` and `"manual"`).

**New `mode === "ai"` view** — a small form card:
- **Athlete**: one input — "Instagram Profile URL" (maps to `url` for the edge function, and `name` comes from `fullName` passed as a prop)
- **Employer**: two inputs — "Company Website" (maps to `url`) and "LinkedIn URL" (stored separately)
- A **"Build My Profile with AI"** submit button that:
  1. Calls `supabase.functions.invoke("ai-populate-profile", { body: { role: userType, url, name } })`
  2. Shows a loading state with progress animation (reuse the same loading messages pattern from `AIProfilePopulator.tsx`)
  3. On success: merges returned `profileData` into `formData`, then calls `onRequestAccess(formData)` automatically
  4. On error: shows inline error and stays on the AI form
- A "Back" button → returns to `"choice"`

**Props change**: pass `fullName` (string) into `WaitlistProfileStep` so AI call has a name. Already available in Auth state.

### Files to Change
- `src/pages/Auth.tsx` only — all changes are within `WaitlistProfileStep` component and its call site (pass `fullName` prop)

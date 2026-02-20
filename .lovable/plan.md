
# Admin Invitation Flow: AI Profile Auto-Complete Popup

## Overview

When an admin invites a new user, the invitation email links to `/reset-password`. After the user sets their password, they should see a popup offering to auto-complete their profile with AI -- using the exact same `AIProfilePopulator` component already used on the dashboard.

## Approach: Use a URL parameter + localStorage flag

### Why not just a URL parameter alone?

The `/reset-password` page redirects to another page after success. Passing a query param through Supabase's recovery redirect is fragile. Instead:

1. **Edge function change**: Add `?invited=true` to the `redirectTo` URL in the invite-user function
2. **ResetPassword page**: Detect `invited=true` in the URL search params. On successful password update, store a `pending_ai_profile` flag in localStorage, then navigate to `/dashboard` (instead of `/auth`)
3. **Dashboard page**: On mount, check localStorage for the flag. If present, clear it and show the AI Profile Populator dialog automatically

This is clean because it avoids modifying the AIProfilePopulator component itself.

## Detailed Changes

### 1. Edge Function: `supabase/functions/invite-user/index.ts` (line 191)

Change the redirectTo from:
```
redirectTo: `${appUrl}/reset-password`
```
to:
```
redirectTo: `${appUrl}/reset-password?invited=true`
```

### 2. `src/pages/ResetPassword.tsx`

- Import `useSearchParams` from react-router-dom
- Detect `invited=true` query parameter
- On successful password update: if `invited=true`, set `localStorage.setItem('pending_ai_profile', 'true')` and navigate to `/dashboard` instead of `/auth`

### 3. `src/pages/Dashboard.tsx`

- Import `AIProfilePopulator` and Dialog components
- Add state `showAIPopup` (boolean, default false)
- In a `useEffect` (after role is loaded): check if `localStorage.getItem('pending_ai_profile')` is set. If yes, remove it and set `showAIPopup = true`
- Render a standalone Dialog that wraps the `AIProfilePopulator` component, controlled by `showAIPopup`
- The AIProfilePopulator already accepts `role` and `userId` props and has its own Dialog internally. Since we must not modify it, we will render it with its dialog pre-opened by programmatically triggering it

**Alternative (simpler)**: Since `AIProfilePopulator` manages its own Dialog state internally and we cannot modify it, we will instead create a small wrapper popup that:
- Shows a welcome message: "Welcome! Would you like to auto-complete your profile with AI?"
- Has two buttons: "Complete with AI" (which renders/triggers the AIProfilePopulator) and "Skip"
- This wrapper dialog is controlled by the `showAIPopup` state

### 4. No changes to `AIProfilePopulator`

The existing component remains untouched. It will be rendered inside the welcome popup and the user clicks "Complete with AI" to open it naturally.

## Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/invite-user/index.ts` | Add `?invited=true` to redirectTo URL |
| `src/pages/ResetPassword.tsx` | Detect `invited` param; on success, set localStorage flag and navigate to `/dashboard` |
| `src/pages/Dashboard.tsx` | Check localStorage flag on mount; show welcome popup with embedded AIProfilePopulator |

## Flow Diagram

```text
Admin invites user
       |
       v
Email link -> /reset-password?invited=true
       |
       v
User sets password -> localStorage flag set -> navigate to /dashboard
       |
       v
Dashboard detects flag -> shows welcome popup
       |
       v
User clicks "Complete with AI" -> AIProfilePopulator opens (unchanged)
```

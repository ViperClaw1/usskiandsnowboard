

# Add Settings Page Navigation

## Current Problem

The `/settings` route exists in the router and the page works, but there is no link or button pointing to it from any navigation component. Users have no way to discover or reach it.

## Proposed Solution

Add a Settings link in three places so both Athletes and Partners (and Admins) can access it:

### 1. Authenticated Top Nav (Desktop)

**File:** `src/components/AuthenticatedNav.tsx`

- Add a gear icon button (using `Settings` icon from lucide-react) next to the "Sign Out" button
- Clicking it navigates to `/settings`
- Small icon-only button to keep the nav clean

### 2. Mobile Nav (Slide-out Menu)

**File:** `src/components/MobileNav.tsx`

- Add a "Settings" link in the nav items list, placed between the "Dashboard" button and the "Sign Out" button
- Uses the same styling as other nav links

### 3. No Dashboard Landing Page Changes Needed

The Settings page is an account-level concern (notification preferences, phone number), not a dashboard view. Placing it in the persistent nav bar ensures it's accessible from every authenticated page, which is the right pattern.

## Files Changed

| File | Change |
|------|--------|
| `src/components/AuthenticatedNav.tsx` | Add a Settings icon button linking to `/settings` next to Sign Out |
| `src/components/MobileNav.tsx` | Add a "Settings" text link before the Sign Out button |

## What Stays the Same

- Settings page itself -- no changes
- Dashboard components -- no changes
- Routing in App.tsx -- already configured



# Skeleton Loading and Fade-In Transitions for Athletes.tsx and Employers.tsx

## Summary

Replace all loading states with comprehensive skeleton elements that cover every UI element (nav area, headings, subtext, cards). Add a smooth `animate-fade-in` transition when the real content appears. Remove any remaining spinner usage.

## Changes

### Files Modified
- `src/pages/Athletes.tsx`
- `src/pages/Employers.tsx`

### What Changes in Each File

**1. Auth-loading skeleton (while `getUser()` resolves)**

Currently Athletes.tsx has a partial skeleton (heading placeholders + 3 `ProfileCardSkeleton`). Employers.tsx has no `authLoading` guard at all -- it jumps straight to the authenticated or unauthenticated view, causing a flash.

Both files will get a full-page skeleton that mirrors the final layout:
- A skeleton bar where the nav/header sits (matching the height of `AuthenticatedNav`)
- Skeleton rectangles for the page title and subtitle
- 3 `ProfileCardSkeleton` cards in the grid

**2. Unauthenticated data-loading skeleton (while `loadEmployers()` runs)**

Already using `ProfileCardSkeleton` in the grid, but the hero section (title + subtitle) renders immediately while cards are still loading, creating a visual mismatch. The hero section will also get skeleton placeholders during `loading === true`, so the entire page is skeletonized until data arrives.

**3. Fade-in transition on resolved content**

Every final-render branch (authenticated view and unauthenticated view) will wrap its content in a `div` with `className="animate-fade-in"` using the existing 300ms ease-out animation already defined in the project's Tailwind config. This gives a smooth reveal once skeletons are replaced.

**4. No spinners**

Neither file currently imports `LoadingSpinner`, so no removal is needed. The existing `animate-pulse` skeleton approach is already in place and will be extended to cover all elements.

---

## Technical Details

### Employers.tsx
- Add an `authLoading` early-return block (same pattern Athletes.tsx already has) with full-page skeletons including a nav-height placeholder, title skeleton, subtitle skeleton, and 3 card skeletons.
- Wrap the authenticated return in `<div className="animate-fade-in">`.
- Wrap the unauthenticated return in `<div className="animate-fade-in">`.
- In the unauthenticated loading branch, add skeleton placeholders for the hero section (title + subtitle) above the card grid.

### Athletes.tsx
- Enhance the existing `authLoading` skeleton to include a nav-height placeholder bar at the top.
- Wrap the authenticated return in `<div className="animate-fade-in">`.
- Wrap the unauthenticated return in `<div className="animate-fade-in">`.
- In the unauthenticated loading branch, add skeleton placeholders for the hero section above the card grid.

### No new files or dependencies needed
Uses the existing `ProfileCardSkeleton`, `Skeleton` component, and `animate-fade-in` class.




# Fix Component Mounting Flash/Shakiness

## Problem

When clicking "Browse Partner Directory" (or similar navigation buttons) on the dashboard, the content flashes briefly during mounting. This happens because:

1. The view switch instantly unmounts the landing page and mounts the new component
2. The directory component renders its loading spinner, then swaps to full content -- causing a layout jump
3. There is no transition animation between views, making the swap feel jarring

The same pattern affects **all view transitions** in both the Athlete and Partner dashboards (directory, connections, portfolio, preview).

## Solution

Apply a **fade-in animation** to all view containers, and replace the plain spinner in directory components with **skeleton cards** that match the final layout shape (preventing layout shift).

### Changes

**1. Add a fade-in CSS animation (`src/index.css`)**

Add a simple `animate-fade-in` keyframe animation (opacity 0 to 1, ~200ms ease-out). This is lightweight and prevents the jarring instant-swap effect.

**2. Apply fade-in to all view containers in `AthleteDashboard.tsx`**

Wrap each `currentView` branch (directory, portfolio, connections) with the `animate-fade-in` class so they smoothly appear when mounted.

**3. Apply fade-in to all view containers in `EmployerDashboard.tsx`**

Same treatment for the Partner dashboard's directory, preview, and connections views.

**4. Replace spinner with skeleton cards in `EmployerDirectory.tsx`**

Instead of a lone `Loader2` spinner during loading, render skeleton cards (search bar placeholder + 3 card skeletons) that match the final layout shape. This eliminates the layout shift when data arrives.

**5. Replace spinner with skeleton cards in `AthleteDirectory.tsx`**

Same skeleton treatment for the Athlete Directory component used by partners.

**6. Apply fade-in to `AthleteLandingPage.tsx` and `PartnerLandingPage.tsx`**

Add the fade-in class to the landing page root containers too, so returning to "home" also transitions smoothly.

### Technical Details

The fade-in animation in `index.css`:
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 200ms ease-out;
}
```

Skeleton loading replacement (EmployerDirectory example):
```typescript
if (loading) {
  return (
    <div className="animate-fade-in">
      <div className="mb-4"><Skeleton className="h-10 w-full" /></div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ProfileCardSkeleton />
        <ProfileCardSkeleton />
        <ProfileCardSkeleton />
      </div>
    </div>
  );
}
```

### Files to modify

| File | Change |
|------|--------|
| `src/index.css` | Add `fade-in` keyframe + utility class |
| `src/components/dashboard/AthleteDashboard.tsx` | Add `animate-fade-in` to all view containers |
| `src/components/dashboard/EmployerDashboard.tsx` | Add `animate-fade-in` to all view containers |
| `src/components/athlete/EmployerDirectory.tsx` | Replace spinner with skeleton cards + fade-in |
| `src/components/employer/AthleteDirectory.tsx` | Replace spinner with skeleton cards + fade-in |
| `src/components/dashboard/athlete/AthleteLandingPage.tsx` | Add `animate-fade-in` to root |
| `src/components/dashboard/employer/PartnerLandingPage.tsx` | Add `animate-fade-in` to root |

No database changes needed.



## What needs to change in `src/pages/Athletes.tsx`

The unauthenticated section currently has two branches:
- `athletesWithSlicedSkills.length === 0` → shows `EmptyState` component
- `length > 0` → shows blurred cards + lock overlay

**Goal**: Always show the lock overlay when logged out, even if the athletes array is empty — matching the pattern in `Employers.tsx`.

### Single change — lines 175–266

1. Move `relative` from the inner container `div` up to `<section>` (matching Employers.tsx line 169)
2. Remove the `athletesWithSlicedSkills.length === 0 ? <EmptyState> : (...)` conditional entirely
3. Always render the blurred grid + lock overlay — when the array is empty the grid renders nothing behind the blur, and the overlay card still shows centered
4. Remove the now-unused `EmptyState` import and `Users` icon import

### Result structure (mirrors Employers.tsx exactly)
```
<section className="py-8 sm:py-12 relative">
  <div className="container mx-auto px-4 max-w-7xl">
    {/* Blurred card grid (empty or populated) */}
    <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
      <div className="grid gap-6 ...">
        {athletesWithSlicedSkills.map(...)}   ← renders nothing if empty
      </div>
    </div>
    {/* Lock overlay — always shown when logged out */}
    <div className="absolute inset-0 flex items-center justify-center">
      <Card>Sign In to View Athletes</Card>
    </div>
  </div>
</section>
```

### Files changed
- `src/pages/Athletes.tsx` only — remove `EmptyState`/`Users` imports, restructure the unauthenticated section

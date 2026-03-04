
## Root Cause

`AthleteDashboard.tsx` line 352 wraps all content in:
```tsx
<div className="min-h-screen bg-background overflow-x-hidden">
```

`overflow-x: hidden` on an element that is also `min-h-screen` creates a **secondary scroll container** in some browsers. When the dashboard content briefly changes height during the React Query background-refetch cycle on repeated visits (cache hit → render → background re-fetch fires → brief layout shift), the browser detects the inner element exceeds the viewport and shows a scrollbar on that inner div for a few frames. This is the inner scrollbar flash athletes see.

`overflow-x: hidden` alone shouldn't create a y-scroll context, but per the CSS spec, setting `overflow-x: hidden` implicitly promotes the element to a block formatting context — and on certain Chrome/Safari versions, if the content height fluctuates (due to the `dashboardLoading` guard in `AthleteLandingPage` briefly rendering `<LoadingSpinner>` instead of full content), the browser briefly considers the element scrollable in the y direction too.

## Fix

**`src/components/dashboard/AthleteDashboard.tsx`** — Remove `overflow-x-hidden` from the outer wrapper div. To still prevent horizontal overflow without creating a scroll container, apply the overflow clipping on the `<html>`/`<body>` level (already done via `overflow-x-hidden` in the global stylesheet) rather than on this inner component.

```diff
- <div className="min-h-screen bg-background overflow-x-hidden">
+ <div className="min-h-screen bg-background">
```

This is safe because `src/index.css` already has `body { padding-right: 0 !important }` and the global `scrollbar-gutter: stable` on `:root`, so there is no risk of horizontal overflow escaping.

### Files to change
- `src/components/dashboard/AthleteDashboard.tsx` — line 352: remove `overflow-x-hidden` from the wrapper div

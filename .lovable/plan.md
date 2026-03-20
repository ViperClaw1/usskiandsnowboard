
## Problem

In both `AthleteLandingPage.tsx` and `PartnerLandingPage.tsx`, the hero section has a two-part layout:

1. **Profile info block** — absolutely positioned at `sm:bottom-0 sm:translate-y-1/2`, so it hangs 50% below the banner image.
2. **Spacer + completion card** — a `div` with `sm:pt-20` below the banner that: (a) creates vertical room for the hanging profile block, and (b) optionally renders the completion card flush-right.

The problem: when the completion card is visible, the `sm:pt-20` spacer creates a large empty gap between the profile block and the bottom edge of the card, since the spacer's height is fixed regardless of whether the card is present. The reference screenshot shows the desired result: the profile block and the completion card share the same bottom border line.

## Root cause

The current design adds a fixed `pt-20` spacer under the banner and then appends the completion card below it. There's no alignment relationship between the profile block (which overflows the banner) and the completion card (which sits in the flow below).

## Fix — both files

Replace the current "spacer-then-card" pattern with a **flex row** that directly contains both the profile info block and the completion card, so their bottom edges are naturally aligned by flexbox.

The profile info block currently lives inside the `relative overflow-visible` banner div as an absolutely-positioned child. The fix is to move the layout so both items sit in the same flex container, bottom-aligned (`items-end`), which removes the need for the fixed `pt-20` spacer entirely when the card is shown.

### Approach

**On `sm+` screens only**, change the spacer/completion area from:
```
fixed pt-20 spacer
  └─ (optional) completion card right-aligned
```
to:
```
flex row, items-end, justify-end
  └─ (optional) completion card
     → no spacer needed; the banner's translate-y-1/2 profile block sets the height naturally
```

Concretely, when `completeness < 100`:
- Keep `pb-6` on the outer wrapper but remove `pt-20` and replace it with `pt-0`
- Wrap the completion card in a `flex justify-end items-end` div that does **not** have the artificial top padding

When `completeness === 100` (card hidden):
- Keep `sm:pt-20` so the banner profile block still has its spacer room below it (current behavior, unchanged)

This is a conditional class change: `sm:pt-20` only when `completeness >= 100`, `sm:pt-0 sm:pb-6` when `completeness < 100`.

### Files changed
- `src/components/dashboard/athlete/AthleteLandingPage.tsx` — line ~300 spacer div
- `src/components/dashboard/employer/PartnerLandingPage.tsx` — line ~307 spacer div

Both files have an identical structure; the fix is the same one-line class change in each.

### Exact change (same in both files)

```tsx
// Before
<div className="px-4 sm:px-6 pb-0 sm:pb-6 pt-0 sm:pt-20">
  {completeness < 100 && (
    <div className="flex justify-end">
      <Card ...>

// After
<div className={`px-4 sm:px-6 ${completeness < 100 ? "pb-4 sm:pb-6 pt-0 sm:pt-0" : "pb-0 sm:pb-6 pt-0 sm:pt-20"}`}>
  {completeness < 100 && (
    <div className="flex justify-end items-end">
      <Card ...>
```

This means:
- **Profile < 100%**: No top padding, card sits directly below the banner — bottom of the card aligns naturally with the bottom of the profile info block (both sit at the same vertical level since the profile block is translate-y-1/2 out of the banner).
- **Profile = 100%**: Original `sm:pt-20` spacer is preserved, no empty space issue since the card is gone.

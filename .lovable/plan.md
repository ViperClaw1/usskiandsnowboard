
## Fix: Avatar clipped by overflow-hidden

### Root cause

Both preview components place the `Avatar` absolutely inside a container that has `overflow-hidden`, so the avatar's bottom half is cut off.

- **`EmployerProfilePreview.tsx` line 37**: `<div className="relative ... overflow-hidden">` — the Avatar at `-bottom-8` is clipped
- **`AthleteProfilePreview.tsx` line 38**: `<Card className="overflow-hidden">` — same effect; the relative banner div is a child of the clipping card

### Fix (both files)

Split the banner into two layers:

1. An **inner div** (no overflow) that holds only the background image or gradient + upload controls — this stays `overflow-hidden` to clip the banner image to its corners
2. The **Avatar** moves **outside** that inner div but remains inside the outer `relative` wrapper, which itself has no overflow constraint

```text
<div class="relative">                          ← NO overflow-hidden here
  <div class="h-28 overflow-hidden rounded-t-...">  ← overflow-hidden only on the image box
    [background image or gradient]
  </div>
  [Change photo pill — absolute, outside clipping box]
  <Avatar class="absolute -bottom-8 left-6 ..."/>  ← now free to overflow
</div>
<div class="pt-10 pb-2">name / sport</div>
```

For `AthleteProfilePreview`, also remove `overflow-hidden` from the wrapping `<Card>`.

### Files to change (2)

1. **`src/components/profile/AthleteProfilePreview.tsx`**
   - Remove `overflow-hidden` from `<Card className="overflow-hidden">`
   - Restructure: move the avatar outside the banner's inner image div, keeping it in the outer `relative` wrapper

2. **`src/components/profile/EmployerProfilePreview.tsx`**
   - Remove `overflow-hidden` from the outer `relative` div (line 37)
   - Add `overflow-hidden` only on the inner image/gradient div (with `rounded-t-lg` if needed)
   - Avatar stays in the outer `relative` wrapper, not inside the clipping box

No other files need changing — the inline directory dialogs (`AthleteDirectory`, `EmployerDirectory`, `ConnectionsList`) all use these two shared components.

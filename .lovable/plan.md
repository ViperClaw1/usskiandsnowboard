
## Current State

In `TrainingArticleManager.tsx`, the two Select dropdowns (`handleFontFamilyChange` and `handleFontSizeChange`) call `updateTypography()` immediately on every change — there is no staging/preview step before persisting.

**Lines of interest:**
- **160–191**: Typography hook usage + `handleFontFamilyChange` / `handleFontSizeChange` handlers (both call `updateTypography` immediately)
- **356–405**: CardHeader render — the two selects and "New Article" button in a single `flex flex-wrap` row

---

## Plan

### 1. Add local "pending" typography state

In the component, add two pieces of state:
```
pendingFontFamily: string  — mirrors globalFontFamily from DB, updated when selects change
pendingFontSize: string    — mirrors globalFontSize from DB, updated when selects change
pendingChanged: boolean    — true when pending ≠ saved, enables the submit button
```

On first load / when DB values change, `useEffect` syncs the pending state to match the saved DB values (so selects start showing current saved values).

### 2. Replace immediate `updateTypography` calls with local state updates

`handleFontFamilyChange` → sets `pendingFontFamily` only (no DB write)  
`handleFontSizeChange` → sets `pendingFontSize` only (no DB write)

### 3. Add a "Save Font Settings" button

Disabled when `!pendingChanged`. When clicked, opens the confirmation dialog.

### 4. Add confirmation AlertDialog

Content:
- **Title**: "Apply Font Settings to All Articles?"  
- **Body**: "You are about to update the global font style for all training articles. These changes will be visible immediately to all users browsing the Training section. This cannot be automatically undone."  
- **Actions**: Cancel | Apply Settings (calls `updateTypography` with the pending values)

Reuse the existing `AlertDialog` import already present in the file — no new imports needed.

### 5. Layout — responsive toolbar

The CardHeader currently uses a single `flex flex-wrap` row. Replace it with a two-row layout on small screens:

```
Desktop (≥ md):  [FileText  Training Articles]   [Type ▾ Font   ▾ Size  [Save Font Settings]  [+ New Article]]
Mobile/tablet:   [FileText  Training Articles]
                 [Type ▾ Font  ▾ Size]
                 [[Save Font Settings]  [+ New Article]]
```

Achieved via `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` on the CardHeader wrapper, and grouping the controls in their own nested flex div.

### Files changed

Only `src/components/dashboard/admin/TrainingArticleManager.tsx`:
1. Add `pendingFontFamily`, `pendingFontSize` state and a `confirmOpen` boolean for the AlertDialog
2. Add `useEffect` to sync pending state from DB values on load
3. Update `handleFontFamilyChange` / `handleFontSizeChange` to write only to local state
4. Add `handleConfirmApply` that calls `updateTypography` and closes dialog
5. Add "Save Font Settings" `Button` (with `Save` icon) and new `AlertDialog` for confirmation
6. Adjust CardHeader layout classes for responsive stacking

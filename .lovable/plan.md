

# Fix: `selectedAthlete` Gets Nullified Before Request Dialog Opens

## Root Cause

The bug is a **race condition between two dialogs**. Here's what happens step by step:

1. User clicks an athlete card -- `setSelectedAthlete(athlete)` is called
2. The athlete detail dialog opens (line 669): `open={!!selectedAthlete && !showRequestDialog}`
3. User clicks "Request Connection" -- `setShowRequestDialog(true)` is called
4. The detail dialog's `open` prop becomes `false` (because `!showRequestDialog` is now `false`)
5. The dialog closing triggers `onOpenChange(false)`, which calls `setSelectedAthlete(null)`
6. Now when `handleSendRequest` runs, `selectedAthlete` is `null` -- triggering the error toast

In short: opening the request dialog **closes** the athlete detail dialog, and the detail dialog's close handler **clears** `selectedAthlete`.

## Fix

Change the `onOpenChange` handler on the athlete detail dialog (line 669) so it only clears `selectedAthlete` when the request dialog is **not** being shown. This prevents the close-triggered nullification.

**File: `src/components/employer/AthleteDirectory.tsx`**

Change line 669 from:
```typescript
onOpenChange={(open) => !open && setSelectedAthlete(null)}
```
to:
```typescript
onOpenChange={(open) => {
  if (!open && !showRequestDialog) {
    setSelectedAthlete(null);
  }
}}
```

This single-line change ensures `selectedAthlete` is only cleared when the user intentionally closes the detail dialog (e.g., clicks the X or outside), not when it closes because the request dialog is opening.

No other files need to change.


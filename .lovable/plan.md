# Fix Expert Detail Dialog on Mobile

## Problems observed
1. Opening an expert card on mobile shows a dialog that can't be scrolled or zoomed, and the X close button is often off-screen.
2. The only way to dismiss it is the device Back button, which then navigates the user away from `/experts` (often to `/athletes`) instead of just closing the dialog.

## Proposed solution

### 1. Make the dialog mobile-friendly (in `src/components/experts/ExpertDirectory.tsx`)
- Constrain `DialogContent` height: `max-h-[90vh]` with internal scroll (`overflow-y-auto`) so long bios/expertise text don't push the close button off-screen.
- On small screens, make it nearly full-width with safe-area padding so the built-in X (top-right) is always reachable.
- Add an explicit, always-visible **Close** button at the bottom of the dialog (in addition to the X) so users on small viewports never have to hunt for it.
- Keep the banner image as a fixed-height header that doesn't grow; only the body section scrolls.

### 2. Make the device Back button close the dialog (not leave the page)
When a user opens an expert dialog, push a temporary history entry (e.g. `history.pushState({ expertDialog: true }, "")`). Listen for `popstate`:
- If the dialog is open and the user hits Back → close the dialog and stay on `/experts`.
- If the user closes the dialog via X / Close button / overlay click → call `history.back()` once to clean up the temporary entry.

This is a small, isolated effect tied to `selectedExpert` state. It fixes the "Back takes me to Athletes" problem at its root: the back button now consumes the temporary history entry instead of popping `/experts` off the stack.

### 3. Optional polish
- Same treatment applied to the connection-request dialog opened from inside the detail dialog, so back behavior is consistent there too.

## Technical details
- File touched: `src/components/experts/ExpertDirectory.tsx` only. No backend, schema, or routing changes.
- Classes added to `DialogContent`: `max-h-[90vh] overflow-hidden flex flex-col` on the wrapper; inner content wrapper becomes `flex-1 overflow-y-auto`.
- New `useEffect` keyed on `selectedExpert` for the history push / popstate listener, with cleanup that removes the listener and (if needed) pops the temporary entry.
- No change to how the dialog is opened from the grid card; only how it renders and how it dismisses.

## Out of scope
- No change to filters, data fetching, or the directory grid.
- No change to the global router or navigation behavior outside this dialog.

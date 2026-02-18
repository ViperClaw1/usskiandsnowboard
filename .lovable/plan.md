

# Fix Layout Shift Caused by Radix UI Scroll Lock

## Root Cause

Radix UI (used by Select, Dialog, Popover, etc.) uses `react-remove-scroll` internally. When a dropdown opens, it:

1. Adds `data-scroll-locked="1"` attribute to the `<body>`
2. Sets `overflow: hidden` on the body
3. Adds `margin-right` (via `--removed-body-scroll-bar-size` CSS variable) to compensate for the removed scrollbar

Since the page already uses `scrollbar-gutter: stable` on `:root` to reserve scrollbar space, the additional `margin-right` from Radix creates "double compensation" -- the gutter space PLUS the margin, causing a visible rightward shift.

The current `padding-right: 0 !important` fix targets the wrong property. Radix uses `margin-right`, not `padding-right`.

## Solution

Override the scroll-locked body styles with a targeted CSS rule using the `data-scroll-locked` attribute that Radix adds. This is the community-verified fix from Radix's own GitHub issue tracker.

## File to Modify

**`src/index.css`** -- Replace the current partial fixes with a comprehensive override:

1. Keep `scrollbar-gutter: stable` on `:root` (already there)
2. Remove `overflow-y: scroll !important` and `padding-right: 0 !important` from the `html` rule (no longer needed)
3. Add a new rule targeting `body[data-scroll-locked]` that:
   - Forces `overflow-y: scroll !important` so the scrollbar stays visible
   - Zeros out `margin-right` with `!important` to cancel Radix's compensation
   - Keeps `padding-right: 0 !important` on body as a safety net

This approach neutralizes Radix's scroll lock compensation while letting `scrollbar-gutter: stable` handle everything.

## Technical Details

The CSS changes in `src/index.css`:

```css
/* Remove from html rule: */
/* overflow-y: scroll !important;  -- DELETE */
/* padding-right: 0 !important;    -- DELETE */

/* Add new rule: */
html body[data-scroll-locked] {
  overflow-y: scroll !important;
  margin-right: 0 !important;
}
```

The `body` rule keeps `padding-right: 0 !important` as-is for general protection.

No other files need changes. This fix applies globally to every Radix component that uses scroll locking (Select, Dialog, Popover, AlertDialog, Sheet, etc.).

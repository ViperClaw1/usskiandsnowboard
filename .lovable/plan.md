

# Fix Layout Shift from Radix UI Scroll-Lock Conflict

## Root Cause

The layout shift is NOT caused by a scrollbar appearing/disappearing. It is caused by a **conflict between two systems** both trying to handle scrollbar space:

1. **`scrollbar-gutter: stable`** on `html` -- always reserves scrollbar space (our fix from earlier)
2. **Radix UI's `react-remove-scroll`** -- when a Select/Dialog/Popover opens, it sets `overflow: hidden` on the body AND adds `padding-right` equal to the scrollbar width to compensate

Result: the gutter space is reserved AND extra padding is added, causing the content to shift right by the scrollbar width.

## Solution

Add a single CSS rule in `src/index.css` to prevent the inline `padding-right` that Radix injects on the body from taking effect:

```css
body {
  padding-right: 0 !important;
}
```

This keeps `scrollbar-gutter: stable` doing its job (reserving consistent space) while stopping the duplicate compensation from Radix's scroll-lock.

## File to Modify

**`src/index.css`** -- Add `padding-right: 0 !important;` to the existing `body` rule inside the `@layer base` block.

No other files need to change. This is a single-line addition to an existing rule.


# Fix Layout Shift from Scrollbar on Dropdown Open

## Problem

When a Radix UI Select dropdown opens, its portaled content can cause the page body to exceed the viewport height. This triggers a vertical scrollbar to appear, which shifts the entire page layout to the left by the scrollbar width (~15-17px). When the dropdown closes, the scrollbar disappears and the layout shifts back.

## Root Cause

The `html` element has no `scrollbar-gutter` or permanent `overflow-y` setting, so the scrollbar only appears when content overflows, causing the layout jump.

## Solution

Add `scrollbar-gutter: stable` to the `html` element in `src/index.css`. This CSS property reserves space for the scrollbar at all times, so when it appears or disappears, there is no layout shift.

## File to Modify

**`src/index.css`** -- Add one rule inside the existing `@layer base` block:

```css
html {
  scrollbar-gutter: stable;
}
```

This is placed before the existing `body` rule. No other files need to change. The fix applies globally to all pages and all dropdown types (Select, DropdownMenu, Popover, etc.).

## Why This Approach

| Option | Pros | Cons |
|--------|------|------|
| `scrollbar-gutter: stable` | No visual change when scrollbar not needed; modern, clean | Not supported in very old browsers (pre-2021) |
| `overflow-y: scroll` | Universal support | Always shows a scrollbar track, even on short pages |
| `overflow: hidden` on body when dropdown opens | No scrollbar at all | Requires JS logic, blocks page scroll |

`scrollbar-gutter: stable` is the best modern solution -- it is supported by all current browsers and requires zero JavaScript.

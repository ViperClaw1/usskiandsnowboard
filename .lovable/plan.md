
# Fix Location Dropdown Overflow

## Root Cause

The Location dropdown has the same classes as Company Size and Industry, but one employer's `hq_location` value is an extremely long AI-generated string: *"Mountain West and Northeast (based on Bryan Dunn's location), likely with projects in Big Sky, MT, and Teton Valley, ID"*. The `SelectContent` component naturally expands to fit its widest item, causing it to overflow the page.

## Fix

### 1. Constrain the dropdown width (UI)

**File: `src/components/athlete/EmployerDirectory.tsx`**

Add `max-w` and text truncation to the Location `SelectContent` on both mobile and desktop views so the dropdown never exceeds a reasonable width, regardless of content length.

- Desktop (line 502): Add `className="bg-popover max-w-[400px]"`
- Mobile (line 397): Add `max-w-[300px]` similarly
- Wrap `SelectItem` text in a truncated span so long values get ellipsis: `<span className="truncate block max-w-full">{location}</span>`

### 2. (Data quality note -- no code change)

The long location value is caused by the AI profile populator generating a sentence instead of a short city/state. This is a data quality issue from AI scraping. For now the UI fix handles it gracefully. If desired in the future, the AI prompt could be updated to constrain location output to "City, State" format.

---

## Technical Details

Both the desktop filter section (around line 502-509) and mobile filter section (around line 397-406) will get:
- `SelectContent` gets `max-w-[400px]` to cap width
- Each `SelectItem` wraps location text in `<span className="truncate block">` for ellipsis on overflow
- A `title` attribute on the span provides the full text on hover


# Fix Location Dropdown: Truncate Text Instead of Limiting Container

## Change

Remove the `max-w-[...]` constraint from the `SelectContent` container and instead set a fixed `max-w` on the text `<span>` inside each `SelectItem`. This way the dropdown sizes naturally but long text gets an ellipsis ("Some text...").

### File: `src/components/athlete/EmployerDirectory.tsx`

**Mobile filter (line 397):**
- Remove `max-w-[400px]` from `SelectContent` -- revert to just `className="bg-popover z-50"`
- Change span from `max-w-full` to `max-w-[250px]` so long text truncates

**Desktop filter (line 504):**
- Remove `max-w-[500px]` from `SelectContent` -- revert to just `className="bg-popover"`
- Change span from `max-w-full` to `max-w-[350px]` so long text truncates

The `truncate` class already handles the ellipsis; we just need to give the span a concrete max-width instead of `max-w-full` (which doesn't constrain anything).


## Root Cause

In `src/hooks/useDashboardLayout.ts` lines 43–46, the `useQuery` `select` option calls `setLayout` directly:

```ts
select: (data) => {
  setLayout({ text_overrides: data });  // ← setState called during render
  return data;
},
```

The `select` callback runs **synchronously during React's render phase**. Calling `setLayout` inside it schedules an immediate re-render while the current render hasn't finished — React detects this loop and throws "Too many re-renders."

This was introduced when the previous fix to prevent scrollbar flashing moved the layout fetching to React Query (to leverage `initialData`), but accidentally kept the `setLayout` side-effect inside `select` rather than in a proper `useEffect`.

## Fix

Remove the `select` callback entirely and sync the query result into local `layout` state via a `useEffect` that watches the query data — which runs **after** render, not during:

```ts
const { data: queryData, isLoading: loading } = useQuery<Record<string, string>>({
  queryKey: dashboardLayoutKey(role),
  queryFn: () => fetchDashboardLayout(role),
  initialData: () => queryClient.getQueryData<Record<string, string>>(dashboardLayoutKey(role)),
  staleTime: 5 * 60 * 1000,
  // No select here
});

useEffect(() => {
  if (queryData) {
    setLayout({ text_overrides: queryData });
  }
}, [queryData]);
```

This is the minimal fix — one file, two-line change. All other behavior (saving, resetting, `updateTextOverride`) stays identical.

### File to change
- **`src/hooks/useDashboardLayout.ts`** — replace `select` with a `useEffect`

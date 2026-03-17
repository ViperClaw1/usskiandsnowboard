
## Analysis of Current State

The system **already has** global typography implemented and working:

**What exists:**
- `TYPOGRAPHY_QUERY_KEY = ["training-global-typography"]` shared across 3 consumers
- `queryClient.setQueryData` for optimistic updates on change (no loading flash)
- DB persistence via `dashboard_layouts` table, `role = 'training'`, `text_overrides.__typography`
- `fetchGlobalTypography` defined in TrainingArticleManager, TrainingArticle, and Training — **tripled**
- `saveGlobalTypography` does a read-then-write (two round trips per change)
- `staleTime: 0` means every mount re-fetches from the network, but `setQueryData` means UI is instant
- The `RichTextarea` wrapper receives `bodyPreviewStyle` via an inline `<div>` wrapper — works but doesn't reach inside the editor's `contentEditable`
- `Training.tsx` and `TrainingArticle.tsx` each re-declare `fetchGlobalTypography` independently

**What the task is actually asking:**

The user wants a proper, production-quality architecture review and implementation. The existing system works but has:
1. Duplicated `fetchGlobalTypography` in 3 files
2. `saveGlobalTypography` does 2 DB round-trips (read + write) instead of 1 (upsert)
3. No shared hook — logic is embedded directly in the component
4. `staleTime: 0` on all consumers means every navigation to `/training` or `/training/:slug` refetches

**The plan: Refactor into a proper shared hook + eliminate duplication**

### Files to change

1. **`src/hooks/useTrainingTypography.ts`** — NEW: extract shared query fn, query key, and typed hook
2. **`src/components/dashboard/admin/TrainingArticleManager.tsx`** — use the hook, replace inline logic
3. **`src/pages/Training.tsx`** — use the hook (remove inline `fetchGlobalTypography`)
4. **`src/pages/TrainingArticle.tsx`** — use the hook (remove inline `fetchGlobalTypography`)

### Architecture Design

**Single source of truth:** `["training-global-typography"]` query key in one place.

**Hook interface:**
```typescript
// src/hooks/useTrainingTypography.ts

export interface TrainingTypography {
  font_family: string; // "" = inherit
  font_size: string;   // "" = inherit, else "16" (px implied)
}

export const TRAINING_TYPOGRAPHY_QUERY_KEY = ["training-global-typography"] as const;

// Read hook — used by Training.tsx, TrainingArticle.tsx, TrainingArticleManager.tsx
export function useTrainingTypography(): {
  typography: TrainingTypography;
  isLoading: boolean;
  typographyStyle: React.CSSProperties;
}

// Write mutation — used only by TrainingArticleManager.tsx
export function useUpdateTrainingTypography(): {
  update: (next: TrainingTypography) => void; // optimistic + async persist
}
```

**`typographyStyle`** is computed inside the hook and returned ready-to-use, eliminating all 3 inline style derivations.

**Single DB query function** lives in the hook file — all 3 consumers import from one place.

**`saveGlobalTypography` rewrite:** Use a single `upsert` with `onConflict: 'role'` instead of read-then-write. This cuts 2 DB round trips to 1.

**`staleTime`:** Change consumers in Training.tsx and TrainingArticle.tsx from `staleTime: 0` to `staleTime: 60_000` (1 min). The admin manager stays at `staleTime: 0` so the admin always sees current settings when opening the panel. When the admin changes settings, `queryClient.setQueryData` updates all mounted subscribers instantly — no re-fetch needed.

**Real-time propagation:** Already works via shared query key + `setQueryData`. All 3 pages that mount `useQuery` with `["training-global-typography"]` will re-render the moment `setQueryData` is called — React Query's subscriber model handles this automatically.

**CSS variable approach (why NOT to use it here):**
- `dangerouslySetInnerHTML` HTML is already in the DOM as static markup — CSS variables injected at the wrapper level propagate naturally via inheritance. The current `style={{ fontFamily, fontSize }}` on the wrapper div works correctly for this use case.
- A React Context approach would add complexity without benefit since all consumers already share the same React Query cache.
- The `RichTextarea` editor's `contentEditable` div inherits font styles from its parent — the `bodyPreviewStyle` wrapper div in the Dialog already covers this correctly.

### Detailed Changes

**`src/hooks/useTrainingTypography.ts`** (new file):
```typescript
const TYPOGRAPHY_DB_KEY = "__typography";
export const TRAINING_TYPOGRAPHY_QUERY_KEY = ["training-global-typography"] as const;

// Single shared fetch fn
const fetchTrainingTypography = async (): Promise<TrainingTypography> => { ... };

export function useTrainingTypography(options?: { staleTime?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: TRAINING_TYPOGRAPHY_QUERY_KEY,
    queryFn: fetchTrainingTypography,
    staleTime: options?.staleTime ?? 60_000,
  });
  const typographyStyle: React.CSSProperties = {
    fontFamily: data?.font_family || undefined,
    fontSize: data?.font_size ? `${data.font_size}px` : undefined,
  };
  return { typography: data ?? { font_family: "", font_size: "" }, isLoading, typographyStyle };
}

export function useUpdateTrainingTypography() {
  const queryClient = useQueryClient();
  const update = useCallback((next: TrainingTypography) => {
    // 1. Optimistic update — all subscribers re-render instantly
    queryClient.setQueryData(TRAINING_TYPOGRAPHY_QUERY_KEY, next);
    // 2. Async persist — single upsert, no read-first
    persistTypography(next).catch(() => {
      queryClient.invalidateQueries({ queryKey: TRAINING_TYPOGRAPHY_QUERY_KEY });
      toast.error("Failed to save typography settings");
    });
  }, [queryClient]);
  return { update };
}
```

**`TrainingArticleManager.tsx`:**
- Remove `TYPOGRAPHY_QUERY_KEY`, `fetchGlobalTypography`, `saveGlobalTypography`, `handleFontFamilyChange`, `handleFontSizeChange` (all replaced by hook calls)
- Replace with: `const { typography, typographyStyle } = useTrainingTypography({ staleTime: 0 });` and `const { update } = useUpdateTrainingTypography();`
- `handleFontFamilyChange(value)` → `update({ ...typography, font_family: value === "__none" ? "" : value })`
- `bodyPreviewStyle` → just use `typographyStyle` from the hook

**`Training.tsx`:**
- Remove inline `fetchGlobalTypography` and the `useQuery` block
- Replace with: `const { typographyStyle } = useTrainingTypography();`

**`TrainingArticle.tsx`:**
- Same as Training.tsx

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| No settings in DB | `fetchTrainingTypography` returns `{ font_family: "", font_size: "" }` — `typographyStyle` properties are `undefined`, so inherited styles apply |
| Invalid font value | DB stores raw string; CSS ignores unknown font families gracefully |
| Save fails | `invalidateQueries` re-fetches from DB, rolling back the optimistic update |
| Admin changes settings in one tab | Other tabs: next navigation or focus-triggered re-fetch picks up new values. Same-session components: instant via `setQueryData` |

### Files to change

```
src/hooks/useTrainingTypography.ts        NEW — shared hook
src/components/dashboard/admin/TrainingArticleManager.tsx  Use hook, remove duplication
src/pages/Training.tsx                     Use hook, remove duplication  
src/pages/TrainingArticle.tsx              Use hook, remove duplication
```

No DB migration needed. No new storage. No RLS changes. No new UI — the controls already exist.

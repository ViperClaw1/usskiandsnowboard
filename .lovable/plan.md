
# Performance Strategy Plan

## Root Cause Summary

| Issue | Impact | Fix |
|---|---|---|
| `staleTime: 0` on QueryClient | Every route visit re-fetches all API data | Set `staleTime` + `gcTime` globally |
| `Training.tsx` uses raw `useEffect`/`useState` | No caching — fetches on every mount | Migrate to `useQuery` |
| `TrainingArticle.tsx` uses raw `useEffect`/`useState` | No caching — fetches on every slug visit | Migrate to `useQuery` |
| `useUserRole` fires raw query every mount | Role re-fetched on every component that uses it | Add `useQuery` with stable cache key |
| All 20+ routes eagerly imported | Large initial JS bundle, slow first parse | `React.lazy()` for non-critical routes |
| `AppRoutes` returns `null` during auth load | Full blank screen on hard refresh | Show lightweight skeleton instead of `null` |
| `PublicNav`, `PageFooter`, `HowItWorksSection`, `JoinLegacySection` not memoized | Re-render on every parent state tick | Wrap with `React.memo` |
| Inline `style={{ backgroundImage: ... }}` object recreated every render | Unnecessary style recalculation | Extract to `useMemo` |

---

## Changes

### 1. `src/App.tsx` — 3 changes
- Configure `QueryClient` with `staleTime: 5 * 60 * 1000` (5 min) and `gcTime: 10 * 60 * 1000` (10 min) so cached data survives route changes.
- Lazy-load all non-critical routes (admin pages, Settings, Privacy, Training, TrainingArticle, Schedule, News, Athletes, Employers) with `React.lazy` + `Suspense`.
- Replace the `if (loading) return null` blank screen with a minimal centered spinner `Suspense` fallback.

### 2. `src/hooks/useUserRole.ts` — migrate to `useQuery`
- Replace `useState`+`useEffect` with `useQuery({ queryKey: ["user-role", userId], staleTime: 5 * 60 * 1000 })`.
- Role data is then cached globally across all consumers — `Home.tsx`, `Athletes.tsx`, `Employers.tsx` all share the same cache entry for a given `userId`.

### 3. `src/pages/Training.tsx` — migrate to `useQuery`
- Replace `useState`+`useEffect` fetch with `useQuery({ queryKey: ["training-articles"], staleTime: 5 * 60 * 1000 })`.
- Stale-while-revalidate: on repeat visits the list renders instantly from cache while a background refresh runs silently.

### 4. `src/pages/TrainingArticle.tsx` — migrate to `useQuery`
- Replace `useState`+`useEffect` fetch with `useQuery({ queryKey: ["training-article", slug], staleTime: 5 * 60 * 1000 })`.
- Article body is cached per-slug — navigating back to a previously read article is instant.

### 5. `src/components/layout/PublicNav.tsx`, `PageFooter.tsx`, `HowItWorksSection.tsx`, `JoinLegacySection.tsx`
- Wrap each with `React.memo` — these are pure presentational components that receive no props (or stable props) and currently re-render on every parent state tick.

### 6. `src/pages/Home.tsx` — memoize `backgroundImage` style objects
- Extract the two `style={{ backgroundImage: ... }}` template literal objects into `useMemo` to prevent recreating the object reference on every render tick.

### 7. `src/pages/Training.tsx` — memoize derived `filtered` array
- Wrap the `filtered` derived array in `useMemo([articles, activeCategory])` so category-switching does not re-sort the full article list unnecessarily.

---

## What does NOT change
- All visual output — identical pixels
- All routing paths
- All Supabase queries — same SQL, same data contracts
- All business logic
- All component APIs / props

## File list
```text
Modified:
  src/App.tsx
  src/hooks/useUserRole.ts
  src/pages/Training.tsx
  src/pages/TrainingArticle.tsx
  src/pages/Home.tsx
  src/components/layout/PublicNav.tsx
  src/components/layout/PageFooter.tsx
  src/components/home/HowItWorksSection.tsx
  src/components/home/JoinLegacySection.tsx
```

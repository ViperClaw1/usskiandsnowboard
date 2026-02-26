
## What "the same changes" means

Looking at the previously refactored files (e.g. `Training.tsx`, `Home.tsx`, `PublicNav.tsx`), the pattern applied was:

1. **Semantic block comments** — `// ==============================` dividers with labels (Imports, Types, State, Hooks, Handlers, Effects, Render)
2. **`React.memo`** — on pure presentational components with no or stable props
3. **`useMemo`** — for inline style objects (backgroundImage) and derived/filtered arrays
4. **`useQuery`** — replacing raw `useEffect`/`useState` data fetches
5. **`useCallback`** — for stable event handler references passed as props

---

## Per-file plan

### `AuthenticatedNav.tsx` + `PublicNav.tsx` — prevent re-renders on first visit
- Both are pure presentational components with no props.
- `AuthenticatedNav` has an inline `style={{ backgroundImage: ... }}` object that is recreated every render — extract with `useMemo`.
- `PublicNav` is already wrapped in `React.memo` (done in prior refactor).
- `AuthenticatedNav` is NOT wrapped in `React.memo` — add it.

### `NotFound.tsx`
- Add semantic block comments only (no data fetching, no memoization needed — it's already pure).

### `Privacy.tsx`
- Add semantic block comments only (fully static page).

### `EmailVerification.tsx`
- Add semantic block comments: Imports, State, Handlers, Render.
- No data fetching patterns to migrate.

### `ForgotPassword.tsx`
- Add semantic block comments: Imports, Constants, State, Handlers, Render.
- `validateEmail` inline helper — move outside component (already outside, just add block comment).

### `ResetPassword.tsx`
- Add semantic block comments: Imports, Constants, State, Hooks, Effects, Handlers, Render.
- `passwordRules` array already outside component — add block comment.

### `Auth.tsx`
- Add semantic block comments throughout.
- `mapAuthError` and `passwordRules` already outside component — label them.
- No fetch-to-useQuery migration needed (auth flows are one-shot, not cached).

### `Settings.tsx`
- Add semantic block comments: Imports, Types, Utilities, State, Effects, Handlers, Render.
- Extract `formatPhone`, `unformatPhone`, `validatePhone` into a labeled utilities block.
- `loadPreferences` and `savePreferences` are async handlers — label them as such.

### `Dashboard.tsx`
- Add semantic block comments. Already has some structure but no formal dividers.
- Welcome content objects (`athleteWelcome`, `partnerWelcome`) — label as Constants block.

### `Index.tsx`
- Add semantic block comments (already refactored to use `PublicNav`, `PageFooter`, etc. — just needs block dividers).

### `News.tsx`, `Schedule.tsx`, `Athletes.tsx`, `Employers.tsx`
- Already migrated to `useQuery`/`useAuth` in prior refactor.
- Add/complete semantic block comments.
- `Athletes.tsx` and `Employers.tsx` have inline filtered arrays — wrap with `useMemo`.

---

## Files changed

```
src/components/AuthenticatedNav.tsx    — React.memo + useMemo for style + block comments
src/components/layout/PublicNav.tsx   — useMemo for style object + block comments (already memo'd)
src/pages/NotFound.tsx                — block comments
src/pages/Privacy.tsx                 — block comments
src/pages/EmailVerification.tsx       — block comments
src/pages/ForgotPassword.tsx          — block comments
src/pages/ResetPassword.tsx           — block comments
src/pages/Auth.tsx                    — block comments
src/pages/Settings.tsx                — block comments + utility labels
src/pages/Dashboard.tsx               — block comments
src/pages/Index.tsx                   — block comments
src/pages/News.tsx                    — block comments + useMemo for filtered list
src/pages/Schedule.tsx                — block comments
src/pages/Athletes.tsx                — block comments + useMemo for filteredAthletes
src/pages/Employers.tsx               — block comments + useMemo for filtered employers
```

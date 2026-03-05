
# Comprehensive Codebase Refactor Plan

## Audit Summary

After reading all major files across pages, components, hooks, and data layers, here is what I found:

---

## Key Issues Identified

### 1. Duplicated Unauthenticated Nav (Critical)
The same header block (logo + nav links + MobileNav + mountain background) is copy-pasted verbatim in **4 separate files**:
- `src/pages/Index.tsx` — always renders it
- `src/pages/News.tsx` — renders it when `!user`
- `src/pages/Schedule.tsx` — renders it when `!user`
- `src/pages/Employers.tsx` — renders it when `!user`

`AuthenticatedNav` already exists. A `PublicNav` presentational component should be extracted and used in all four places.

### 2. Duplicated Footer
The identical footer block (`© 2025 U.S. Ski & Snowboard...`) is copy-pasted in:
- `Index.tsx`, `Home.tsx`, `News.tsx`, `Schedule.tsx`

A `PageFooter` presentational component should be extracted.

### 3. Duplicated "How It Works" + "Join Our Legacy" Sections
`Index.tsx` and `Home.tsx` contain near-identical "How It Works" card grid and "Join Our Legacy" sections. These should become shared presentational components.

### 4. Duplicated `Article` / `TrainingArticle` Interface
The `TrainingArticle` interface is defined independently in:
- `src/pages/Training.tsx`
- `src/pages/TrainingArticle.tsx`
- `src/components/dashboard/admin/TrainingArticleManager.tsx` (as `Article`)

These should be consolidated into `src/types/training.ts`.

### 5. Duplicated `CATEGORY_COLORS` constant
Defined separately in:
- `src/pages/Training.tsx`
- `src/pages/TrainingArticle.tsx`

Should move to `src/constants/training.ts`.

### 6. Duplicated `CATEGORIES` array
Defined as `TRAINING_CATEGORIES` in `Training.tsx` and as `CATEGORIES` in `TrainingArticleManager.tsx`. Should be a single export from `src/constants/training.ts`.

### 7. `loadUserRole` pattern repeated across 3 pages
`Athletes.tsx`, `Employers.tsx`, and `Dashboard.tsx` all manually call `supabase.from("user_roles")` inline. This belongs in a `useUserRole(userId)` custom hook.

### 8. Smart/Dumb Separation Missing
- `Home.tsx` and `Training.tsx` are both smart (data fetching) and presentational (full JSX render) in the same component.
- `AthleteLandingPage.tsx` has 484 lines mixing data fetching, real-time subscriptions, and deeply nested JSX. The pure card sub-sections should be dumb components.

### 9. Missing Semantic Block Structure
No files currently use the structured comment blocks (`// === Imports ===`, `// === State ===`, etc.) as required by the refactoring spec.

### 10. Inline Auth State Listeners in Pages
`Athletes.tsx` manually wires `supabase.auth.onAuthStateChange` — this duplicates what `AuthContext` already provides. It should use `useAuth()` instead.

### 11. `MobileNav` contains sign-out business logic
`MobileNav` is supposed to be a presentational navigation component, but contains a full `handleSignOut` function with Supabase calls — same logic as `AuthenticatedNav`. This should be extracted to a `useSignOut` hook.

---

## Proposed Changes

### New Files to Create

```
src/types/
  training.ts          — TrainingArticle + Article interfaces
  news.ts              — NewsArticle interface (shared between Home + News pages)
  connections.ts       — Connection, ConnectionStats, ConnectionRequest interfaces
  profiles.ts          — AthleteProfile, EmployerProfile interfaces

src/constants/
  training.ts          — TRAINING_CATEGORIES, CATEGORY_COLORS
  nav.ts               — NAV_ITEMS array (used by MobileNav, AuthenticatedNav)

src/hooks/
  useUserRole.ts       — extracts the repeated user_roles query pattern
  useSignOut.ts        — extracts the repeated signOut + clear storage pattern

src/components/layout/
  PublicNav.tsx        — dumb: renders unauthenticated header (logo, links, MobileNav)
  PageFooter.tsx       — dumb: renders the shared copyright footer

src/components/home/
  HowItWorksSection.tsx — dumb: the "How It Works" 3-card grid (shared by Index + Home)
  JoinLegacySection.tsx — dumb: the "Join Our Legacy" CTA section (shared by Index + Home)
```

### Files to Modify

| File | What Changes |
|---|---|
| `src/pages/Index.tsx` | Remove inline header + footer + section JSX; use `PublicNav`, `PageFooter`, `HowItWorksSection`, `JoinLegacySection`; add semantic block comments |
| `src/pages/Home.tsx` | Remove inline footer + section JSX; use `PageFooter`, `HowItWorksSection`, `JoinLegacySection`; extract news data-fetch into comment-labeled blocks |
| `src/pages/News.tsx` | Remove inline `!user` header; use `PublicNav`; use `PageFooter`; add semantic block comments |
| `src/pages/Schedule.tsx` | Remove inline `!user` header; use `PublicNav`; use `PageFooter`; add semantic block comments |
| `src/pages/Athletes.tsx` | Remove manual auth listener; use `useAuth()`; extract `loadUserRole` to `useUserRole` hook; add semantic block comments |
| `src/pages/Training.tsx` | Import types from `src/types/training.ts`; import constants from `src/constants/training.ts`; add semantic block comments |
| `src/pages/TrainingArticle.tsx` | Import types/constants from shared files; add semantic block comments |
| `src/components/dashboard/admin/TrainingArticleManager.tsx` | Import shared types/constants; add semantic block comments |
| `src/components/MobileNav.tsx` | Extract `handleSignOut` into `useSignOut` hook; add semantic block comments |
| `src/components/AuthenticatedNav.tsx` | Use `useSignOut` hook instead of inline handler; add semantic block comments |
| `src/pages/Dashboard.tsx` | Add semantic block comments; annotate welcome content constants |

### Files That Do NOT Change
- All Supabase edge functions
- All UI primitives in `src/components/ui/`
- `src/components/auth/AuthContext.tsx`
- `src/App.tsx`
- `src/integrations/` (auto-generated)
- All admin page files (`AllUsers`, `AllAthletes`, etc.)
- `src/data/suggestions.ts`

---

## Execution Order (Safe Steps)

The changes are grouped to avoid broken references at any intermediate step:

**Step 1 — New shared types/constants (no existing files touched)**
- Create `src/types/training.ts`
- Create `src/constants/training.ts`

**Step 2 — New shared hooks (no existing files touched)**
- Create `src/hooks/useUserRole.ts`
- Create `src/hooks/useSignOut.ts`

**Step 3 — New layout/section components (no existing files touched)**
- Create `src/components/layout/PublicNav.tsx`
- Create `src/components/layout/PageFooter.tsx`
- Create `src/components/home/HowItWorksSection.tsx`
- Create `src/components/home/JoinLegacySection.tsx`

**Step 4 — Update consumers (all at once to avoid stale imports)**
- Update `Training.tsx` + `TrainingArticle.tsx` + `TrainingArticleManager.tsx` to use shared types/constants
- Update `MobileNav.tsx` + `AuthenticatedNav.tsx` to use `useSignOut`
- Update `Index.tsx`, `Home.tsx`, `News.tsx`, `Schedule.tsx` to use `PublicNav`, `PageFooter`, shared sections
- Update `Athletes.tsx` to use `useAuth()` and `useUserRole`
- Add semantic block comments to `Dashboard.tsx` and `Settings.tsx`

---

## What Will NOT Change
- All visual output — identical pixels
- All routing — same paths
- All Supabase queries — no logic changes
- All component APIs — props unchanged
- All edge functions

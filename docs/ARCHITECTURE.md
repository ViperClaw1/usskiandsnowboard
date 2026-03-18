# Architecture Documentation

> **Project:** U.S. Ski & Snowboard — Athlete Connection Platform  
> **Last Updated:** 2026-03-18  
> **Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Supabase (Lovable Cloud)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Backend Documentation](#4-backend-documentation)
5. [API Documentation](#5-api-documentation)
6. [Database Documentation](#6-database-documentation)
7. [Frontend Documentation](#7-frontend-documentation)
8. [Data Flow](#8-data-flow)
9. [Environment Variables](#9-environment-variables)
10. [Error Handling and Edge Cases](#10-error-handling-and-edge-cases)
11. [Known Limitations / Future Improvements](#11-known-limitations--future-improvements)
12. [Suggested Documentation Improvements in the Codebase](#12-suggested-documentation-improvements-in-the-codebase)

---

## 1. Project Overview

**Athlete Connection** is a private, invitation-only networking platform built for **U.S. Ski & Snowboard** to connect elite athletes with career opportunities after competitive sport. The platform bridges three user types:

| Role | Description |
|------|-------------|
| **Athlete** | A U.S. Ski & Snowboard athlete seeking career mentorship, internships, and job opportunities |
| **Employer (Partner)** | An organization or individual willing to offer roles, mentorship, or introductions |
| **Admin** | Platform administrator managing users, connections, content, and analytics |

### Core value proposition
- Athletes build professional portfolios highlighting transferable skills
- Partners browse curated athlete profiles and initiate connections
- Admins approve waitlist applicants, manage content, and monitor the ecosystem

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│  React 18 SPA · Vite · TypeScript · Tailwind CSS             │
│  React Router v6 · TanStack Query v5 · shadcn/ui             │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS / Supabase JS Client
┌────────────────────────▼─────────────────────────────────────┐
│                   SUPABASE (Lovable Cloud)                    │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Auth        │  │  PostgreSQL  │  │  Edge Functions     │ │
│  │  (JWT-based) │  │  (RLS-gated) │  │  (Deno / TypeScript)│ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │  Storage    │  │  Realtime    │                          │
│  │  (files)    │  │  (pub/sub)   │                          │
│  └─────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      Resend           Twilio        Firecrawl
  (transactional     (SMS alerts)   (web scraping
     email)                          for AI fill)
```

### Key architectural decisions

| Decision | Rationale |
|----------|-----------|
| **SPA with client-side routing** | Fast in-app navigation; all routing handled by React Router v6 |
| **TanStack Query for server state** | Global cache prevents redundant Supabase calls; roles and profiles cached for 5 min |
| **Auth via `onAuthStateChange` only** | Supabase v2 fires `INITIAL_SESSION` synchronously from local cache — no extra `getSession()` round-trip needed |
| **Memoized `<Outlet>`** | Prevents entire route tree from re-rendering on auth state changes |
| **Row-Level Security everywhere** | All DB access enforced at Postgres level; frontend UI restrictions are defence-in-depth only |
| **Invitation-only via waitlist** | New users submit a waitlist application; admins approve and send magic-link invites |

---

## 3. Project Structure

```
/
├── docs/                         # ← Project documentation (this folder)
├── public/                       # Static assets served at root
│   ├── email/                    # Email template assets (logo, header bg)
│   ├── schedule.pdf              # Competition schedule PDF
│   └── sitemap.xml
├── src/
│   ├── assets/                   # Bundled image assets (imported by components)
│   ├── components/
│   │   ├── athlete/              # Athlete-specific UI (portfolio, docs, videos…)
│   │   ├── auth/                 # AuthContext — global auth state provider
│   │   ├── connections/          # Connection activity board
│   │   ├── dashboard/            # Role-branched dashboards + admin sub-components
│   │   │   ├── admin/            # Admin-only: charts, user tables, content editors
│   │   │   ├── athlete/          # Athlete landing page inside dashboard
│   │   │   └── employer/         # Partner landing page inside dashboard
│   │   ├── employer/             # Partner-specific UI (company form, athlete directory…)
│   │   ├── home/                 # Public home page sections
│   │   ├── layout/               # PageFooter, PublicNav
│   │   ├── notifications/        # Bell icon, notification list
│   │   ├── onboarding/           # Multi-step onboarding wizard layout
│   │   ├── profile/              # AI profile populator, profile previews
│   │   └── ui/                   # shadcn/ui primitives + custom UI atoms
│   ├── constants/
│   │   ├── nav.ts                # NAV_ITEMS — role-filtered navigation links
│   │   └── training.ts           # Training categories / constants
│   ├── data/
│   │   └── suggestions.ts        # Static suggestion data
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Responsive breakpoint hook
│   │   ├── useDashboardLayout.ts # Admin dashboard layout state
│   │   ├── useEffectiveFontSize.ts
│   │   ├── useSignOut.ts         # Sign-out + storage clear + navigate
│   │   ├── useTrainingTypography.ts
│   │   └── useUserRole.ts        # Cached role fetcher (5 min stale time)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Auto-generated Supabase client (do not edit)
│   │       └── types.ts          # Auto-generated DB types (do not edit)
│   ├── lib/
│   │   ├── sanitizeArticleHtml.ts # DOMPurify-style HTML sanitiser for articles
│   │   └── utils.ts              # Tailwind `cn()` helper
│   ├── pages/
│   │   ├── admin/                # Admin-only pages (AllUsers, AllAthletes…)
│   │   ├── Auth.tsx              # Sign-in / sign-up / waitlist multi-step flow
│   │   ├── Dashboard.tsx         # Role-branched dashboard entry point
│   │   ├── Home.tsx              # Authenticated home page
│   │   ├── Index.tsx             # Public landing page
│   │   ├── Training.tsx          # Training article listing
│   │   ├── TrainingArticle.tsx   # Single training article renderer
│   │   └── …                     # Other public/shared pages
│   ├── types/
│   │   └── training.ts           # Training article TypeScript types
│   └── App.tsx                   # Root: providers, router, route tree
├── supabase/
│   ├── config.toml               # Supabase project config (auto-managed)
│   ├── functions/                # Edge Functions (Deno/TypeScript)
│   │   ├── _shared/              # Shared email template helper
│   │   ├── ai-populate-profile/  # AI profile auto-fill via Firecrawl + LLM
│   │   ├── delete-user/          # Admin: delete user + cascade
│   │   ├── handle-waitlist-decision/ # Approve/decline waitlist applications
│   │   ├── invite-user/          # Admin: create user + send invite email
│   │   ├── resend-confirmation/  # Admin: resend email confirmation link
│   │   ├── scrape-news/          # Admin: scrape US Ski news via Firecrawl
│   │   ├── send-admin-notification/  # Notify admins of platform events
│   │   ├── send-admin-summary/   # Weekly/daily analytics digest email
│   │   ├── send-confirmation-email/  # Auth webhook: send email on signup
│   │   ├── send-connection-notification/ # Email+SMS on connection events
│   │   ├── send-role-notification/   # Email when role is granted/revoked
│   │   ├── send-temp-password/   # Admin: reset user password + email
│   │   └── submit-waitlist-application/ # Public: submit waitlist form
│   └── migrations/               # SQL migration files (chronological)
└── …config files (vite, tailwind, tsconfig, eslint…)
```

### Responsibilities of major modules

| Module | Responsibility |
|--------|---------------|
| `src/components/auth/AuthContext.tsx` | Single source of truth for `user`, `session`, `loading` state. Uses `onAuthStateChange` only — resolves from local cache synchronously on repeat visits |
| `src/hooks/useUserRole.ts` | Fetches and caches the user's role (`athlete`/`employer`/`admin`) globally via TanStack Query with 5-min stale time |
| `src/hooks/useSignOut.ts` | Encapsulates sign-out: calls Supabase, clears storage, navigates to `/` |
| `src/components/AppLayout.tsx` | Wraps all routes; conditionally renders Authenticated or Public nav; shields `<Outlet>` via `memo` |
| `src/pages/Dashboard.tsx` | Role-branches to `AthleteDashboard`, `EmployerDashboard`, `AdminDashboard`, or `RoleSelection` |
| `src/components/dashboard/admin/` | All admin-specific UI: analytics charts, user management tables, content editors, waitlist manager |
| `src/constants/nav.ts` | Centralised navigation link definitions with `allowedRoles` filters |
| `supabase/functions/` | All server-side logic: user lifecycle, email delivery, AI calls, news scraping |

---

## 4. Backend Documentation

The backend is entirely managed by **Supabase (Lovable Cloud)**. There is no custom Node/Express server.

### Authentication

- **Provider:** Supabase Auth (email + password)
- **OAuth:** Google and Apple OAuth are blocked via a `before_user_created` hook (`block_oauth_signup_hook`) — new OAuth signups are rejected to enforce invitation-only access
- **Invitation flow:**
  1. User submits a waitlist application (public, no auth required)
  2. Admin approves via the Admin Dashboard
  3. `handle-waitlist-decision` Edge Function creates the user in Supabase Auth and sends a password-reset magic link
  4. User sets their password and completes onboarding
- **Session management:** JWT-based; resolved from `localStorage` synchronously via `INITIAL_SESSION` event. No server-side sessions.
- **Email verification:** Handled via a webhook that triggers `send-confirmation-email` Edge Function on signup

### Storage

Supabase Storage is used for:

| Bucket / Path | Content |
|--------------|---------|
| Athlete photos | Profile photos, gallery images, hero/background images |
| Athlete documents | Resumes, certifications, and other PDFs |
| Employer logos | Company logos and background images |
| Training article heroes | Hero images for training content |

### Edge Functions

All Edge Functions are written in **Deno/TypeScript** and deployed automatically. Functions that require admin authentication validate the caller's JWT and check for an `admin` role in `user_roles` before proceeding.

| Function | Auth Required | Description |
|----------|--------------|-------------|
| `submit-waitlist-application` | None (public) | Accepts waitlist form submissions; checks for duplicate emails |
| `handle-waitlist-decision` | Admin JWT | Approve or decline a waitlist applicant; creates user account on approval |
| `invite-user` | Admin JWT | Directly invite a user by email; creates account + sends invite email |
| `delete-user` | Admin JWT | Delete a user and all associated data via auth cascade |
| `resend-confirmation` | Admin JWT | Regenerate and resend an email confirmation link |
| `send-temp-password` | Admin JWT | Generate a temporary password and email it to a user |
| `send-role-notification` | Admin JWT | Email a user when their role is granted or revoked |
| `send-confirmation-email` | Supabase webhook | Send branded confirmation email on new signup |
| `send-connection-notification` | Internal | Email + SMS notifications for connection request events |
| `send-admin-notification` | Internal | Notify admins of new accounts, requests, and connection events |
| `send-admin-summary` | Admin JWT | Send a daily/weekly analytics digest to admins |
| `scrape-news` | Admin JWT | Scrape US Ski & Snowboard news via Firecrawl API; upsert into `news_articles` |
| `ai-populate-profile` | User JWT | Scrape a URL via Firecrawl + call LLM to extract and return structured profile data |

---

## 5. API Documentation

See [`API.md`](./API.md) for full endpoint reference.

---

## 6. Database Documentation

### Schema summary

All tables are in the `public` schema. RLS (Row-Level Security) is enabled on all tables.

| Table | Description |
|-------|-------------|
| `profiles` | Core user record: email, full name, phone. Referenced by role-specific profile tables |
| `user_roles` | Maps `user_id → role` (`athlete`/`employer`/`admin`). Separate from `profiles` to avoid privilege escalation |
| `athlete_profiles` | Athlete-specific data: bio, sport discipline, skills, career interests, sponsors, social links |
| `employer_profiles` | Partner-specific data: company info, industry, opportunities offered, contact details |
| `athlete_achievements` | Competition results and milestones linked to `athlete_profiles` |
| `athlete_awards` | Awards and honours with optional image |
| `athlete_documents` | Uploaded documents (resumes, PDFs) with storage URLs |
| `athlete_videos` | Video links (YouTube/Vimeo) with metadata |
| `certifications` | Professional or athletic certifications |
| `education` | Education history |
| `experience` | Work/volunteer experience |
| `connection_requests` | Tracks connection requests between an `athlete_profile` and an `employer_profile` with status (`pending`/`accepted`/`declined`) |
| `waitlist_applicants` | Pre-registration applications with status (`pending`/`approved`/`declined`) |
| `notifications` | In-app notifications per user |
| `notification_preferences` | Per-user email/SMS notification opt-in settings |
| `news_articles` | Scraped news articles from US Ski & Snowboard website |
| `training_articles` | Admin-authored training content with rich HTML body, slug, status, and typography settings |
| `dashboard_layouts` | Admin-editable text overrides for dashboard copy per role |

### Key relationships

```
profiles (1) ──── (1) athlete_profiles
                          │
                          ├── athlete_achievements (many)
                          ├── athlete_awards (many)
                          ├── athlete_documents (many)
                          ├── athlete_videos (many)
                          ├── certifications (many)
                          ├── education (many)
                          └── experience (many)

profiles (1) ──── (1) employer_profiles

athlete_profiles (many) ── connection_requests ── (many) employer_profiles

auth.users (1) ──── (1) profiles  [via trigger on signup]
auth.users (1) ──── (many) user_roles
```

### RLS policy overview

- **`user_roles`:** Users can only INSERT roles `athlete` or `employer` for themselves, and only once (no self-escalation to `admin`). Admins can manage all roles.
- **`profiles`:** Users can read and update their own profile only.
- **`athlete_profiles` / `employer_profiles`:** Owners can CRUD their own profile. Authenticated users can read public profiles.
- **`connection_requests`:** Athletes and employers can read their own requests; only authenticated users with appropriate profiles can insert.
- **`notifications`:** Users can only read and create notifications for their own `user_id`.
- **`waitlist_applicants`:** Readable by admins only. Insertions are handled via the public Edge Function (service role key).
- **`news_articles` / `training_articles`:** Readable by all authenticated users; writeable by admins only.

### Database functions

| Function | Description |
|----------|-------------|
| `has_role(_user_id, _role)` | `SECURITY DEFINER` function to check role membership without recursive RLS issues |
| `block_oauth_signup_hook(event)` | Auth hook that rejects OAuth signups to enforce invitation-only access |
| `setup_admin_user(email, password)` | One-time helper to bootstrap the initial admin account |
| `clear_connection_requests()` | Utility to purge all connection requests (admin use) |

### Views

| View | Description |
|------|-------------|
| `admin_analytics_summary` | Aggregated stats: total users, athletes, employers, connection counts |
| `athletes_by_sport` | Athlete count grouped by `sport_discipline` |
| `employers_by_industry` | Employer count grouped by `industry` |
| `connections_by_day` | Daily connection request activity (total, pending, accepted, rejected) |
| `user_signups_by_day` | Daily signup counts by role |
| `top_athlete_profiles` | Top athletes by `profile_completeness` and `profile_views` |
| `top_employer_profiles` | Top employers by `profile_completeness` and `profile_views` |

---

## 7. Frontend Documentation

### Providers and global state

```
<QueryClientProvider>        ← TanStack Query cache
  <TooltipProvider>
    <ThemeProvider>           ← next-themes (light/dark)
      <AuthProvider>          ← user, session, loading (from onAuthStateChange)
        <BrowserRouter>
          <AppRoutes />       ← Route tree
          <CookieConsent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </TooltipProvider>
</QueryClientProvider>
```

### Routing

All routes are nested under `<AppLayout>`, which handles conditional nav rendering:

| Path | Component | Access |
|------|-----------|--------|
| `/` | `HomeRoute` → `Index` (public) or `Home` (authenticated) | All |
| `/auth` | `Auth` | Unauthenticated |
| `/email-verification` | `EmailVerification` | Unauthenticated |
| `/forgot-password` | `ForgotPassword` | Unauthenticated |
| `/reset-password` | `ResetPassword` | Unauthenticated |
| `/dashboard` | `Dashboard` (role-branched) | Authenticated |
| `/athletes` | `Athletes` | All |
| `/employers` | `Employers` | All |
| `/schedule` | `Schedule` | All |
| `/news` | `News` | All |
| `/training` | `Training` | All |
| `/training/:slug` | `TrainingArticle` | Authenticated (athletes + admin) |
| `/waitlist` | `Waitlist` | All |
| `/settings` | `Settings` | Authenticated |
| `/privacy` | `Privacy` | All |
| `/admin/*` | Admin pages | Admin only (UI-enforced) |

### Component hierarchy and conventions

- **Smart components** (pages, dashboards): own data-fetching via `useQuery`; pass data down as props
- **Presentational components** (`src/components/ui/`): stateless, prop-driven, no Supabase calls
- **Role-specific components** (`athlete/`, `employer/`): contain business logic for that user type
- **Custom hooks** (`src/hooks/`): encapsulate reusable logic (auth, sign-out, role fetching, typography)

### Design system

- **Tokens:** Defined in `src/index.css` as CSS custom properties (HSL values). Extended in `tailwind.config.ts`.
- **Component library:** [shadcn/ui](https://ui.shadcn.com/) built on Radix UI primitives
- **Icons:** [Lucide React](https://lucide.dev/)
- **Notifications:** `sonner` for toasts; `@radix-ui/react-toast` for the built-in toaster
- **Forms:** `react-hook-form` + `zod` for validation + `@hookform/resolvers`
- **Charts:** `recharts` for admin analytics charts

### State management approach

| Type of state | Solution |
|--------------|---------|
| Server/async data | TanStack Query (`useQuery`, `useMutation`) |
| Auth state | `AuthContext` (React Context) |
| UI state (modals, local toggles) | `useState` / `useReducer` in component |
| Theme | `next-themes` |
| No global UI state library | By design — avoids over-engineering for this app size |

### Navigation

Navigation items are defined in `src/constants/nav.ts` with optional `allowedRoles` filters. Both `AuthenticatedNav` and `MobileNav` consume the same `NAV_ITEMS` constant. The `/training` route is visible only to `athlete` and `admin` roles.

---

## 8. Data Flow

### User onboarding flow

```
User fills waitlist form
        │
        ▼
submit-waitlist-application (Edge Function, public)
        │  Writes to waitlist_applicants (status: pending)
        ▼
Admin reviews in Admin Dashboard
        │
        ▼
handle-waitlist-decision (Edge Function, admin JWT)
        │  Approve → creates auth user + profiles + user_roles
        │  Decline → updates status, sends decline email
        ▼
User receives invite email with password-reset link
        │
        ▼
User sets password → logs in → Dashboard (role-branched)
        │
        ▼
Welcome popup → AI profile fill or manual form
```

### Connection request flow

```
Partner browses Athletes page
        │  Clicks "Request Connection" on an athlete
        ▼
ConnectionRequestDialog
        │  Inserts into connection_requests (status: pending)
        ▼
send-connection-notification (Edge Function)
        │  Email + SMS to athlete; notifies admins
        ▼
Athlete reviews in Dashboard → Accepts or Declines
        │  Updates connection_requests.status
        ▼
send-connection-notification
        │  Sends acceptance/decline email to partner
        ▼
Accepted: both users have mutual contact details visible
```

### Auth state resolution

```
App boot
  └─ AuthProvider mounts
       └─ supabase.auth.onAuthStateChange() subscribes
            └─ INITIAL_SESSION fires synchronously from localStorage
                 └─ Sets user + session; loading = false
                      └─ AppLayout renders correct nav immediately
                           └─ Dashboard reads role from QueryClient cache (if warm)
```

---

## 9. Environment Variables

The `.env` file is auto-managed by Lovable Cloud and **must not be edited manually**.

| Variable | Used by | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Frontend + Edge Functions | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Frontend config | Supabase project identifier |

### Edge Function secrets (set via Lovable Cloud secrets manager)

| Secret | Used by | Description |
|--------|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | All admin Edge Functions | Service role key for privileged DB access |
| `SUPABASE_ANON_KEY` | Edge Functions that verify user JWTs | Anon key for caller identity verification |
| `RESEND_API_KEY` | All email-sending functions | Transactional email via Resend |
| `TWILIO_ACCOUNT_SID` | `send-connection-notification` | Twilio SMS delivery |
| `TWILIO_AUTH_TOKEN` | `send-connection-notification` | Twilio authentication |
| `TWILIO_PHONE_NUMBER` | `send-connection-notification` | Sender phone number |
| `FIRECRAWL_API_KEY` | `scrape-news`, `ai-populate-profile` | Web scraping via Firecrawl |
| `LOVABLE_API_KEY` | `ai-populate-profile` | Lovable AI model access for profile extraction |

---

## 10. Error Handling and Edge Cases

### Frontend

| Scenario | Handling |
|----------|---------|
| Auth loading | `<LoadingSpinner fullScreen />` shown on Dashboard until auth + role resolve |
| Unauthenticated access to `/dashboard` | Redirected to `/` via `useEffect` in `Dashboard.tsx` |
| Role not yet assigned | `<RoleSelection>` component shown instead of dashboard |
| Component crash | `<ErrorBoundary>` wraps dashboard renders |
| Network/query errors | TanStack Query retries up to 3× with exponential backoff (1s, 2s, 4s) |
| Form validation errors | `zod` schemas + `react-hook-form` field-level error messages |
| Duplicate waitlist applications | Handled in `submit-waitlist-application` Edge Function (returns 409) |

### Backend / Edge Functions

| Scenario | Handling |
|----------|---------|
| Missing auth header | Returns `401 Unauthorized` |
| Non-admin caller on admin functions | Returns `403 Forbidden` |
| Invalid request body | Returns `400 Bad Request` with descriptive message |
| User already exists on invite | Updates existing user instead of creating a new one |
| Email delivery failure | Logged to Edge Function console; returns `500` to caller |
| Firecrawl scrape failure | Returns error response; AI profile fill shows user-facing error |
| Duplicate waitlist email | Returns `409` with context-aware message (pending vs. approved) |

### Security edge cases

| Scenario | Mitigation |
|----------|-----------|
| User self-assigns `admin` role | `user_roles` RLS INSERT policy restricts to `athlete`/`employer` only, and only once per user |
| OAuth signup bypass | `block_oauth_signup_hook` rejects all OAuth-originated new users at the auth layer |
| Cross-role connection requests | UI hides "Request Connection" button for same-role viewers; RLS enforces at DB level |
| Notification injection | `notifications` INSERT policy requires `auth.uid() = user_id` |
| Admin impersonation | Edge Functions verify both JWT identity and `user_roles.role = 'admin'` independently |

---

## 11. Known Limitations / Future Improvements

| Area | Limitation | Suggested Improvement |
|------|-----------|----------------------|
| **Admin route protection** | Admin routes (`/admin/*`) are UI-guarded only via conditional rendering, not route-level guards | Add a `<ProtectedRoute allowedRoles={['admin']}>` wrapper that redirects non-admins |
| **Supabase row limit** | Default Supabase queries return max 1,000 rows | Add `.range()` pagination to all admin list queries |
| **No real-time updates** | Connection request status changes require manual refresh | Add Supabase Realtime subscription on `connection_requests` for live status updates |
| **AI profile fill reliability** | Falls back through 3 AI models; still may fail on unusual websites | Add user-facing retry UI and structured error messages |
| **SMS notifications** | Twilio SMS is sent only if user has a phone in their profile and opt-in enabled | Surface phone number prompt during onboarding |
| **Training content access control** | `/training` page access is UI-filtered by role but the route itself is not hard-protected | Add server-side RLS on `training_articles` reads for non-athlete roles if needed |
| **No automated tests** | No unit or integration test suite in place | Add Vitest unit tests for hooks and utilities; Playwright E2E tests for critical flows |
| **Profile completeness scoring** | `profile_completeness` is a stored numeric column, not computed dynamically | Move to a computed column or view to avoid stale values |
| **No rate limiting on Edge Functions** | Public endpoints (`submit-waitlist-application`) have no rate limiting | Add IP-based rate limiting or Cloudflare protection |
| **Single admin email domain** | `notifications@athleteconnection.org` is hardcoded in multiple Edge Functions | Centralise email sender config into a shared constant or env variable |

---

## 12. Suggested Documentation Improvements in the Codebase

The codebase already has strong inline documentation in many files (block comments, semantic section markers). The following improvements would increase long-term maintainability:

1. **Add JSDoc to all exported hooks and utilities**  
   `useUserRole`, `useSignOut`, and `useDashboardLayout` already have some JSDoc; extend this pattern to `useEffectiveFontSize`, `useTrainingTypography`, and all utility functions in `src/lib/`.

2. **Document Supabase table columns inline**  
   Add a `// Column: description` comment block at the top of each component that has a `useQuery` fetching from Supabase. This makes it easier to understand what data is available without opening the types file.

3. **Add a `CONTRIBUTING.md`**  
   Document the development setup, branch conventions, migration workflow, and how to add new Edge Functions (including the `verify_jwt` config.toml pattern).

4. **Document the RLS policy intent alongside migrations**  
   Each migration file that touches RLS should include a comment explaining the security intent, not just the SQL.

5. **Add route-level comments in `App.tsx`**  
   Group routes into sections (public, authenticated, admin) with `// --- Public Routes ---` style headers for faster orientation.

6. **Edge Function README files**  
   Add a `README.md` inside each Edge Function folder documenting the expected request/response shape. This is partially captured in [`API.md`](./API.md) but having it co-located with the code reduces context-switching.

7. **Document the `profile_data` JSON shape in `waitlist_applicants`**  
   The `profile_data: Json` column stores athlete/employer-specific form data but the expected keys are not documented. Add a TypeScript interface in `src/types/` to represent it.

8. **Centralise all hardcoded copy**  
   Email subjects, welcome messages, and notification text are spread across Edge Functions and `Dashboard.tsx`. Move them to a shared constants file or a content management layer.

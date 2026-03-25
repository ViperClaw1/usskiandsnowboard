
## Experts Feature — Full Implementation Plan

### Overview of what we're building
A new **Experts** section: a top-level nav tab visible to all users, backed by a dedicated `expert_profiles` table, featuring card-based directory, AI-assisted LinkedIn import, athlete→expert connection requests with a templated introduction email, and role-based access controls. The `expert` role joins the existing `app_role` enum.

---

### Database changes (3 migrations)

#### Migration 1 — Extend `app_role` enum + create `expert_profiles` table
```sql
-- 1. Add 'expert' to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'expert';

-- 2. expert_profiles table
CREATE TABLE public.expert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  current_role text,
  area_of_expertise text,
  bio text,
  photo_url text,
  background_image_url text,
  industry text,
  is_alum boolean DEFAULT false,        -- "US Ski & Snowboard Alum" tag
  linkedin_url text,
  email text,
  is_public boolean DEFAULT true,
  profile_completeness integer DEFAULT 0,
  profile_views integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: public read
CREATE POLICY "Public can view public expert profiles" ON public.expert_profiles
  FOR SELECT USING (is_public = true);

-- RLS: admins manage all
CREATE POLICY "Admins can manage all expert profiles" ON public.expert_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: expert owns their profile
CREATE POLICY "Experts can manage their own profile" ON public.expert_profiles
  FOR ALL USING (auth.uid() = user_id);

-- RLS: authenticated athletes can view
CREATE POLICY "Athletes can view expert profiles" ON public.expert_profiles
  FOR SELECT USING (has_role(auth.uid(), 'athlete'::app_role));

-- RLS: authenticated employers can view
CREATE POLICY "Employers can view expert profiles" ON public.expert_profiles
  FOR SELECT USING (has_role(auth.uid(), 'employer'::app_role));
```

#### Migration 2 — `expert_connection_requests` table
```sql
CREATE TABLE public.expert_connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athlete_profiles(id) ON DELETE CASCADE,
  initiated_by_user_id uuid,
  message text,      -- "What are you hoping to learn?"
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expert_id, athlete_id)
);

ALTER TABLE public.expert_connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all expert requests" ON public.expert_connection_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Athletes can create expert requests" ON public.expert_connection_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM athlete_profiles WHERE id = expert_connection_requests.athlete_id AND user_id = auth.uid())
  );

CREATE POLICY "Athletes can view their own expert requests" ON public.expert_connection_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM athlete_profiles WHERE id = expert_connection_requests.athlete_id AND user_id = auth.uid())
  );

CREATE POLICY "Experts can view requests for them" ON public.expert_connection_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM expert_profiles WHERE id = expert_connection_requests.expert_id AND user_id = auth.uid())
  );
```

#### Migration 3 — Updated `app_role` check in `user_roles` INSERT policy (add `expert` to allowed self-assign roles)
```sql
-- The existing INSERT policy only allows athlete/employer self-assignment.
-- Experts are invited by admins, so no change needed to this policy.
-- Admin creates expert roles via the admin panel (same as existing pattern).
```

---

### New Edge Function: `send-expert-connection-notification`

A new edge function that:
1. Receives `{ request_id }` (the `expert_connection_request` id)
2. Fetches expert profile + athlete profile
3. Sends the templated introduction email to **both** parties using `emailTemplate()` from `_shared/email-template.ts`
4. CCs `michele.lowry@usskiandsnowboard.org` (same constant already in the codebase)
5. Uses the subject: `[Athlete First Name] [Athlete Last Name] <> [Expert First Name] [Expert Last Name] — Athlete Connection Introduction`

Email body template:
```
[Expert First Name],

Please meet [Athlete First Name] [Athlete Last Name], an accomplished professional [Athlete Sport] athlete and member of US Ski & Snowboard.

[Athlete First Name], Please meet [Expert First Name] [Expert Last Name], an expert in [Expert Area of Expertise] who is happy to speak to you about their professional experience.

[Expert First Name] will take it from here to introduce themselves and find time to connect.

Cheers, US Ski & Snowboard Athlete Development Team
```

Add to `supabase/config.toml`:
```toml
[functions.send-expert-connection-notification]
verify_jwt = false
```

---

### New files (frontend)

#### 1. `src/pages/Experts.tsx`
Page component mirroring the `Athletes.tsx` / `Employers.tsx` pattern:
- Unauthenticated: blurred grid of 3 expert cards + lock overlay + "Sign In to View Experts"
- Authenticated: intro blurb + `ExpertDirectory` component
- Header section with CMS-editable intro blurb (stored in `dashboard_layouts` under role `expert`)

#### 2. `src/components/experts/ExpertDirectory.tsx`
Main directory component:
- Fetches all public expert profiles
- Filter by industry (uses `industryOptions` from `EmployerDirectory` — same taxonomy + `"US Ski & Snowboard Alum"` filter)
- Search by name
- Card grid: Avatar/headshot fallback (initials), Name, Current Role, Area of Expertise, Industry badge, Alum badge, one-line bio, **"Request a Connection"** CTA (visible to athletes only)
- Clicking a card opens a profile dialog (same pattern as `EmployerDirectory`)
- Profile dialog includes: background image/placeholder, avatar, name, current role, area of expertise, industry, bio, LinkedIn link, connection CTA

#### 3. `src/components/experts/ExpertProfileForm.tsx`
Create/edit form for expert profiles:
- Fields: `full_name`, `current_role`, `area_of_expertise`, `bio`, `industry` (Select using `industryOptions` + "US Ski & Snowboard Alum" special checkbox), `linkedin_url`, `email`, `photo_url`
- LinkedIn URL input + "Auto-fill from LinkedIn" button → calls `ai-populate-profile` edge function with role `expert`
- Used in Admin dashboard (to create expert profiles) and on expert's own dashboard

#### 4. `src/components/experts/ExpertConnectionRequestDialog.tsx`
Dialog shown when athlete clicks "Request a Connection":
- Shows expert name and headshot
- Textarea: "What are you hoping to learn?" (optional, 2–3 sentences)
- Submit button → inserts into `expert_connection_requests` → invokes `send-expert-connection-notification`

#### 5. `src/components/dashboard/ExpertDashboard.tsx`
Simple dashboard for expert role:
- Shows their own profile card
- "Edit Profile" button
- View inbound connection requests (read-only list — no accept/decline needed, email handles it)

---

### Modified files

#### `src/constants/nav.ts`
Add "Experts" tab — **no `allowedRoles` restriction** (visible to all, including unauthenticated):
```ts
{ to: "/experts", label: "Experts" },
```

#### `src/App.tsx`
Add route: `<Route path="/experts" element={<Experts />} />`

#### `src/components/auth/AuthContext.tsx` / `src/hooks/useUserRole.ts`
No changes needed — already handle arbitrary role strings.

#### `src/integrations/supabase/types.ts`
Update `app_role` enum to include `"expert"`.

#### `src/pages/Dashboard.tsx`
Add `expert` case to `renderDashboard()`:
```ts
case "expert":
  return <ExpertDashboard user={user!} />;
```

#### `src/components/dashboard/AdminDashboard.tsx`
Add an "Experts" tab that embeds an `ExpertDirectory` component with an "Add Expert" button allowing admins to create new expert profiles.

#### `supabase/functions/ai-populate-profile/index.ts`
Add an `EXPERT_TOOL` alongside existing `ATHLETE_TOOL` / `EMPLOYER_TOOL` for populating expert profiles from LinkedIn. Fields: `full_name`, `current_role`, `area_of_expertise`, `bio`, `photo_url`, `linkedin_url`.

#### `src/components/profile/AIProfilePopulator.tsx`
Add `"expert"` to the accepted `role` type so experts can use AI population.

---

### Industry taxonomy shared constant

Export `INDUSTRY_OPTIONS` from `src/components/athlete/EmployerDirectory.tsx` (or move to `src/data/suggestions.ts`) so both `EmployerDirectory` and `ExpertDirectory` share one list — **plus** `"US Ski & Snowboard Alum"` as a separate boolean flag (not an industry tag) that can be applied alongside any industry.

---

### Access model enforcement (in components)

| Action | Athlete | Employer | Expert | Admin |
|---|---|---|---|---|
| View Experts page | ✓ (full) | ✓ (full) | ✓ (read-only own) | ✓ |
| View Expert profiles | ✓ | ✓ | ✓ | ✓ |
| Request connection | ✓ | ✗ (button hidden) | ✗ | ✗ |
| Edit own profile | — | — | ✓ | ✓ |
| Create expert profiles | — | — | — | ✓ |

The "Request a Connection" button is conditionally rendered only when `userRole === "athlete"`.

---

### Files to create/modify summary

**New files (7):**
1. `src/pages/Experts.tsx`
2. `src/components/experts/ExpertDirectory.tsx`
3. `src/components/experts/ExpertProfileForm.tsx`
4. `src/components/experts/ExpertConnectionRequestDialog.tsx`
5. `src/components/dashboard/ExpertDashboard.tsx`
6. `supabase/functions/send-expert-connection-notification/index.ts`
7. `supabase/migrations/..._experts.sql` (via migration tool)

**Modified files (7):**
1. `src/constants/nav.ts` — add Experts nav item
2. `src/App.tsx` — add `/experts` route
3. `src/pages/Dashboard.tsx` — add `expert` case
4. `src/components/dashboard/AdminDashboard.tsx` — add Experts admin tab
5. `src/data/suggestions.ts` — export `INDUSTRY_OPTIONS`
6. `supabase/functions/ai-populate-profile/index.ts` — add expert tool
7. `supabase/config.toml` — add expert notification function config

**No DB migration needed for `user_roles` INSERT policy** — admins grant the `expert` role manually via the existing `UserRoleManager`, same as the `admin` role today.

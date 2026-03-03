
## Overview

This is a large multi-part feature. Here's exactly what gets built:

---

### Part 1 — New Landing Screen on `/auth`

The `/auth` page currently opens directly to Sign In. Add a new **initial "landing" step** (`"landing"`) that shows two CTA buttons:
- **Sign In** → switches to current `isSignUp=false` view (no changes to the login form)
- **Join the Platform** → switches to a new `"invite-code"` step

This is a pure UI state machine change in `src/pages/Auth.tsx`.

---

### Part 2 — Invite Code Step

When user clicks "Join the Platform", show:
1. Heading: "Please, enter your invite code"
2. Subheading: "Enter your 7-digit invite code"
3. Input with inline validation (empty check, must match `GOBIG25`)
4. **Confirm** button → validates code → if valid, goes to existing signup form (with invite code pre-filled)
5. **Don't have an invite code?** button → goes to a new `"signup-no-code"` step

---

### Part 3 — "Signup without invite code" Step

A modified signup form:
- Same fields as current signup: Full Name, Email, Password, Confirm Password, Role selector
- **No invite code input** (since they don't have one)
- Submit button labeled **"Next Step"** → instead of creating an account immediately, collects form data and advances to the `"profile-data"` step

---

### Part 4 — "Profile Data" Step (Waitlist Flow)

This step mirrors the welcome popup from `src/pages/Dashboard.tsx`:
1. Show the same role-specific welcome message (athlete or employer)
2. **"Complete with AI"** button → shows inline AI populator UI (same logic from `AIProfilePopulator.tsx` but embedded, no dialog trigger)
3. **"Complete Manually"** button → shows the full profile form inline:
   - For athlete: same fields as `ProfileForm.tsx`
   - For employer: same fields as `CompanyProfileForm.tsx`
4. **"Request Access"** button at the bottom → submits to waitlist, creates a `waitlist_applicants` record in the DB, redirects to `/waitlist`

---

### Part 5 — `/waitlist` Page

Simple static page: "Your application is under review by the platform administrator. You'll receive an email once a decision has been made."

Route added to `App.tsx` and `src/pages/Waitlist.tsx` created.

---

### Part 6 — Database: `waitlist_applicants` Table

New migration creates table:
```sql
CREATE TABLE public.waitlist_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('athlete', 'employer')),
  profile_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
RLS: Admins can read/update all. No user-level RLS needed (unauthenticated inserts via a new edge function).

---

### Part 7 — Edge Function: `submit-waitlist-application`

New edge function (`supabase/functions/submit-waitlist-application/index.ts`):
- Accepts: `{ email, full_name, user_type, profile_data }`
- Inserts into `waitlist_applicants` using service role (bypassing RLS for unauthenticated users)
- Returns success/error

---

### Part 8 — Admin "Waitlist" Tab

In `src/components/dashboard/AdminDashboard.tsx`:
- Add a 5th tab: **Waitlist** (icon: `Clock`)
- Change `grid-cols-4` to `grid-cols-5` in the `TabsList`
- Create `src/components/dashboard/admin/WaitlistManager.tsx`:
  - Table of waitlist applicants with Name, Email, Role, Applied Date, Status
  - Clickable rows → opens a slide-over/dialog with all profile data the user submitted
  - **Approve** and **Decline** buttons per row
  - On approve: calls `approve-waitlist-applicant` edge function
  - On decline: calls `decline-waitlist-applicant` edge function (or same function with action param)

---

### Part 9 — Edge Functions: Approve & Decline Waitlist

`supabase/functions/handle-waitlist-decision/index.ts`:
- Accepts: `{ applicant_id, action: 'approve' | 'decline' }`
- **Approve flow**:
  1. Fetch applicant record
  2. Create Supabase auth user with `supabase.auth.admin.createUser()` (pre-confirmed email)
  3. Create profile record
  4. Assign role in `user_roles`
  5. Insert profile data into `athlete_profiles` or `employer_profiles`
  6. Update `waitlist_applicants.status = 'approved'`
  7. Generate password reset link, send branded approval email with login link
- **Decline flow**:
  1. Update `waitlist_applicants.status = 'declined'`
  2. Send branded decline email
- Both use `emailTemplate()` from `_shared/email-template.ts`

---

### Files Changed

```
NEW   src/pages/Waitlist.tsx
MOD   src/pages/Auth.tsx
MOD   src/App.tsx
NEW   src/components/dashboard/admin/WaitlistManager.tsx
MOD   src/components/dashboard/AdminDashboard.tsx
NEW   supabase/functions/submit-waitlist-application/index.ts
NEW   supabase/functions/handle-waitlist-decision/index.ts
NEW   supabase/migrations/YYYYMMDD_add_waitlist_applicants.sql
```

No changes to existing edge functions or the shared email template.

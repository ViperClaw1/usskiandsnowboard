# Athlete Connection — User Guide

> A friendly, plain-English walkthrough of the U.S. Ski & Snowboard **Athlete Connection** platform — what it is, what each page does, and what you can do as an Athlete, Employer, Expert, or Admin.

---

## Table of Contents

1. [What is Athlete Connection?](#1-what-is-athlete-connection)
2. [Who is the platform for?](#2-who-is-the-platform-for)
3. [Getting in: invite codes & the waitlist](#3-getting-in-invite-codes--the-waitlist)
4. [Signing up & signing in](#4-signing-up--signing-in)
5. [Page-by-page tour](#5-page-by-page-tour)
6. [What you can do as an Athlete](#6-what-you-can-do-as-an-athlete)
7. [What you can do as an Employer](#7-what-you-can-do-as-an-employer)
8. [What you can do as an Expert](#8-what-you-can-do-as-an-expert)
9. [What you can do as an Admin](#9-what-you-can-do-as-an-admin)
10. [Notifications & email](#10-notifications--email)
11. [Privacy, safety & account settings](#11-privacy-safety--account-settings)
12. [Common scenarios (step-by-step)](#12-common-scenarios-step-by-step)
13. [FAQ & troubleshooting](#13-faq--troubleshooting)

---

## 1. What is Athlete Connection?

**Athlete Connection** is a private, invitation-only networking platform built by **U.S. Ski & Snowboard**. It helps current and former U.S. Ski & Snowboard athletes:

- Build a professional profile that highlights their athletic and transferable skills.
- Discover **employers** offering jobs, internships, and mentorship opportunities.
- Connect with **experts** — alumni and industry professionals — for career mentorship.

It is **not** a public job board. Every member is approved through a curated waitlist or invite, so the network stays trusted and high-signal.

---

## 2. Who is the platform for?

There are **four roles**, and each has a tailored experience:

| Role | Who they are | What they do here |
|------|--------------|-------------------|
| **Athlete** | Current or former U.S. Ski & Snowboard athletes | Build a portfolio, browse employers, request connections, work with experts |
| **Employer** | Companies, recruiters, or individuals offering roles | Publish a company profile + open positions, browse athletes, accept connection requests |
| **Expert** | Alumni, trustees, ambassadors, or industry mentors | Offer mentorship, accept connection requests from athletes |
| **Admin** | U.S. Ski & Snowboard staff | Approve waitlist applications, manage users, edit content, monitor analytics |

> Note: A single person can hold more than one role (e.g. an athlete who also wants to mentor). The system resolves a primary active role when you sign in.

---

## 3. Getting in: invite codes & the waitlist

Because the platform is curated, there are **two ways to join**:

### Option A — Invite code
If you have the official invite code (`GOBIG25`), you can sign up immediately:
1. Click **Sign In** → **Join the Platform**.
2. Enter the 7-digit invite code.
3. Pick your role and complete signup.

### Option B — Waitlist application
If you don't have an invite code, you can still apply:
1. Click **Sign In** → **Join the Platform** → **Apply to the Waitlist**.
2. Choose **Athlete**, **Employer**, or **Expert**.
3. Fill out the role-specific application form. (Experts skip the company fields.)
4. Submit. An admin reviews your application and you receive an email decision (approved / declined).

While you wait, the admin team is automatically notified that there's a new applicant of your type.

---

## 4. Signing up & signing in

Supported sign-in methods:

- **Email + password**
- **Google** (sign-in only — new accounts must use email signup or the waitlist)
- **Apple** (sign-in only — same restriction)

The signup flow is a short multi-step wizard:
1. **Landing** — choose Sign In or Join the Platform.
2. **Invite code** — enter `GOBIG25`, or skip to apply via waitlist.
3. **Role selection** — pick Athlete, Employer, or Expert.
4. **Profile data** — basic info (name, email, password) + a few role-specific questions.
5. **Email verification** — confirm your email via a branded verification message.
6. **Welcome** — you're routed to your dashboard, with a one-time onboarding prompt to complete your profile.

If you forget your password, use **Forgot Password** for a branded reset link.

---

## 5. Page-by-page tour

### Public pages (visible to everyone, even signed-out)

| Page | URL | What's there |
|------|-----|--------------|
| **Home / Landing** | `/` | Marketing hero, "How it works", featured news, call to action. Signed-in users see a personalized Home instead. |
| **Athletes** | `/athletes` | Preview of athlete profile cards. Logged-out users always see two full rows of cards (real cards are repeated to fill the grid) with a sign-in prompt. |
| **Employers** | `/employers` | Same pattern — preview of employer cards with a sign-in prompt. |
| **Experts** | `/experts` | Same pattern — preview of expert profile cards with a sign-in prompt. |
| **Schedule** | `/schedule` | Upcoming events and key dates. |
| **News** | `/news` | Latest articles scraped from the U.S. Ski & Snowboard newsroom. |
| **Privacy** | `/privacy` | Privacy policy. |
| **Waitlist** | `/waitlist` | Public waitlist application entry point. |

### Authentication pages

| Page | URL | Purpose |
|------|-----|---------|
| **Auth** | `/auth` | The multi-step sign-in / signup / waitlist flow. |
| **Email Verification** | `/email-verification` | Landing page after clicking the email confirmation link. |
| **Forgot Password** | `/forgot-password` | Request a branded password reset. |
| **Reset Password** | `/reset-password` | Set a new password from a reset link. |

### Authenticated pages

| Page | URL | Purpose |
|------|-----|---------|
| **Dashboard** | `/dashboard` | Your personalized home — different layout for each role. |
| **Training** | `/training` | Articles for athletes (Career Development, Financial Literacy, etc.). Hidden from logged-out users. |
| **Training Article** | `/training/:slug` | Individual training article. |
| **Settings** | `/settings` | Account info, password, phone, notification preferences. |

### Admin-only pages

| Page | URL | Purpose |
|------|-----|---------|
| **All Users** | `/admin/users` | Full user management table. |
| **All Athletes** | `/admin/athletes` | Athletes-only management view. |
| **All Employers** | `/admin/employers` | Employers-only management view. |
| **All Experts** | `/admin/experts` | Experts-only management view. |
| **All Requests** | `/admin/requests` | Pending connection requests across the platform. |
| **Accepted Connections** | `/admin/connections` | History of accepted connections. |
| **Rejected Requests** | `/admin/rejected` | History of rejected requests. |

---

## 6. What you can do as an Athlete

Your dashboard is your home base. From it you can:

- **Build & edit your profile** — name, sport disciplines (Alpine, Freestyle, Nordic, Snowboard), affiliation status (Current / Former Team Member), bio, headshot, location, and links.
- **Auto-fill with AI** — paste your Instagram or LinkedIn URL and let AI populate your profile. You can review and edit before saving.
- **Manage your portfolio** — upload photos, documents, videos, achievements, and awards. Photos and documents live in the unified "Athlete Content" tab.
- **Browse Employers** — view real partner profiles, see open positions, and **send connection requests** with a personal message.
- **Browse Experts** — view mentor profiles and request a 1:1 mentorship connection.
- **Track your activity** — the Activity Board shows pending, accepted, and declined requests in chronological order.
- **Read Training articles** — career development, financial literacy, and more.
- **See profile views** — a counter shows how many times your profile has been opened.

---

## 7. What you can do as an Employer

- **Build a company profile** — company name, size, website, your role/title, contact details, and a short answer to *"What's your connection to U.S. Ski & Snowboard?"*
- **Publish open positions** — featured roles are stored on your profile and shown to athletes.
- **Browse Athletes** — filter and view full athlete profiles.
- **Receive & manage connection requests** — approve or decline athlete requests; both sides get an email notification.
- **Track your active connections** — see who you're connected with and revisit their profiles.

---

## 8. What you can do as an Expert

Experts are mentors, not recruiters. Your toolkit:

- **Build an Expert profile** — full name, job title, area of expertise, industry tags, bio, headshot, LinkedIn URL, and your USSA affiliation (Athlete Alum / Trustee / Ambassador / Next Gen). Company fields are intentionally **omitted** for experts.
- **Auto-fill from LinkedIn** — paste a LinkedIn URL and AI pre-fills the form.
- **Browse Athletes & Employers** — same directories as other roles.
- **Receive connection requests from athletes** — approve or reject; both parties get an email notification (with optional CC to U.S. Ski & Snowboard staff).
- **Track your connections** in the dedicated "My Connections" view.

---

## 9. What you can do as an Admin

The Admin Dashboard has multiple views:

### Analytics view
- **Stats cards**: Total Users, Total Athletes, Total Employers, Expert Profiles (with average completeness), Total Athlete ↔ Employer Connections, Total Athlete ↔ Expert Connections, plus average profile completeness.
- Clicking the **Expert Profiles** card jumps directly to the All Experts management page.
- Charts: signups over time, accepted connections over time, distribution by role and discipline, top profiles by views.

### Waitlist tab
- Review pending applications (Athlete / Employer / Expert).
- Approve or decline — the system sends a branded decision email and provisions the account if approved.
- Direct deep-link from admin email notifications takes you straight here.

### User management
- Full user table (`/admin/users`) — search, filter by role, change roles, resend confirmation emails, invite new users (bypasses Supabase redirect allowlist), or delete accounts.
- Role-specific tables: All Athletes, All Employers, All Experts.
- All connection requests, accepted connections, and rejected requests have dedicated tabs.

### Layout & content editor (CMS)
- Customize **static text and button labels** on each role's landing page (Athlete / Partner / Expert layouts).
- Adjust dashboard **typography** (font sizes/weights) per role.
- Manage **Training articles** — create, edit, categorize, and publish.

### Notifications & summaries
- Receive automatic emails when a new athlete / employer / expert applies to the waitlist (with a CTA button linking straight to the Waitlist tab).
- Periodic admin summary digests.

---

## 10. Notifications & email

The platform sends branded emails (from `U.S. Ski & Snowboard <notifications@athleteconnection.org>`) for:

- **Account lifecycle** — email verification, password reset, role change, temporary password.
- **Waitlist** — new application (to admins), approval / decline (to applicant).
- **Connections** — request created, accepted, declined (athlete ↔ employer and athlete ↔ expert flows).
- **Admin summaries** — periodic digest of platform activity.

If a notification email fails to send, the underlying action (e.g. accepting a connection) still succeeds — notifications are non-fatal.

In-app, the **notification bell** in the header surfaces unread items.

---

## 11. Privacy, safety & account settings

- **Curated access** — every member is invite-coded or admin-approved.
- **Public previews are limited** — logged-out visitors see only profile cards, never full details or contact info.
- **Role separation** — admin role can never be self-assigned during signup.
- **Settings page** — change password, update phone (US-format mask), manage notification preferences, view/edit your profile.
- **Sign out** clears all local and session storage to prevent stale auth state.
- **Cookie consent** — a banner asks for consent on first visit.

---

## 12. Common scenarios (step-by-step)

### Scenario 1 — Athlete applies via waitlist and connects with an employer
1. Visit `/auth` → Join the Platform → Apply to the Waitlist.
2. Choose **Athlete**, fill in profile basics, submit.
3. Admin receives email, opens the Waitlist tab, approves the application.
4. Athlete receives an approval email, sets a password, and signs in.
5. On first login, a choice dialog asks: *"Complete with AI"* or *"Complete manually"*.
6. Athlete completes profile, then visits `/employers`, opens an employer card, and clicks **Connect**.
7. Employer is notified by email and in-app, opens the request, and clicks **Approve**.
8. Both parties get a confirmation email and see each other in their Connections list.

### Scenario 2 — Employer signs up with the invite code
1. Visit `/auth` → Join the Platform → enter `GOBIG25`.
2. Pick role **Employer**, complete signup, verify email.
3. Build company profile (skip if you want to come back later — a one-time onboarding dialog will remind you).
4. Add at least one open position.
5. Browse `/athletes` and start outreach.

### Scenario 3 — Expert mentors an athlete
1. Expert applies via waitlist (no company fields shown).
2. Once approved, expert signs in and completes profile (LinkedIn auto-fill optional).
3. Athlete browses `/experts`, opens a card, clicks **Request Mentorship**, writes a message.
4. Expert receives email + in-app notification, opens the request in **My Connections**, clicks **Approve**.
5. Both receive a confirmation email; optional CC recipients (U.S. Ski & Snowboard staff) are also notified.

### Scenario 4 — Admin invites a new user directly
1. Admin opens `/admin/users` → **Invite User**.
2. Enters email and chooses a role.
3. The system sends a branded invite (bypassing Supabase's default redirect allowlist) with a temporary password.
4. New user signs in, is prompted to change their password, and lands on the role-appropriate dashboard.

### Scenario 5 — Forgotten password
1. Click **Forgot Password** on the sign-in screen.
2. Enter your email — a branded reset link is emailed.
3. Click the link → set a new password on `/reset-password` → sign in.

---

## 13. FAQ & troubleshooting

**I didn't get my verification / reset email.**
Supabase Auth has rate limits (a few emails per hour). Wait a bit and retry, or contact an admin to resend confirmation from the user management page.

**External links (e.g. Instagram) don't open from the preview.**
Inside the Lovable preview environment, some external links are blocked by the browser. Open the same link in a new tab or in the published site.

**I see other users, but no contact details.**
That's by design — full contact details only appear after a connection request is accepted.

**Can I have more than one role?**
Yes. The platform resolves a single active role at sign-in, but admins can grant additional roles.

**How do I delete my account?**
From **Settings** → Account → Delete Account. All your connection requests are removed automatically.

**I'm an athlete — can I still see a partner's profile after I requested to connect?**
Yes. Sending a request does not hide the partner's information.

---

*For developer-facing technical documentation, see [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`API.md`](./API.md).*

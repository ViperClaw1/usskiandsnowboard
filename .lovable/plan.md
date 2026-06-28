# Job Board Feature Plan

Adding a job board where experts post openings and athletes browse them. Reuses existing expert profiles, "New" badge styling, and connection request flow.

## 1. Database (new migration)

**Table: `job_posts`**
- `id`, `expert_id` (FK → `expert_profiles.id`), `source_url`, `job_title`, `company`
- `location` (text), `remote_status` (enum: remote/hybrid/onsite)
- `employment_type` (text), `industry` (text), `expert_note` (text)
- `status` (enum: active/filled/expired/pending), `created_at`, `updated_at`
- UNIQUE (`expert_id`, `source_url`) — prevents duplicate posts

**Table: `job_board_settings`** (single row, admin-managed)
- `require_approval` (bool, default false)
- `industries` (text[]) — editable list

**RLS + GRANTs:**
- Public SELECT on `job_posts` WHERE `status = 'active'` (anon + authenticated)
- Experts INSERT/UPDATE/DELETE own posts (`expert_id` resolves via `auth.uid()`)
- Admins ALL via `has_role(auth.uid(), 'admin')`
- `job_board_settings`: public SELECT, admin UPDATE

**Cron:** Daily job to auto-archive posts older than 60 days (set status='expired').

## 2. Edge function: `parse-job-url`

- Auth-guarded (require expert or admin role)
- Uses existing Firecrawl connector to scrape the URL (markdown + metadata)
- Falls back to Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output to extract: title, company, location, employment_type, industry, remote_status
- Returns parsed fields + a `parse_status` flag; never blocks on failure (returns blanks so expert fills manually)

## 3. Frontend

**New routes:**
- `/jobs` — public job board (feed/grid, filters, search)
- `/jobs/post` — expert posting flow (2-step: paste URL → review/edit → publish)
- `/admin/jobs` — admin management table

**New components:**
- `src/pages/JobBoard.tsx`, `src/pages/PostJob.tsx`
- `src/components/jobs/JobCard.tsx` — title, company, 3 tag badges, expert chip (clickable → `/experts` profile), "New" badge (reuses existing 30-day pill styling from `ExpertBadgeManager`/expert cards), date, external link
- `src/components/jobs/JobFilters.tsx` — Location, Type, Industry filters + search
- `src/components/jobs/PostJobWizard.tsx` — paste URL → call edge fn → editable confirmation form → submit
- `src/components/jobs/ExpertJobsManager.tsx` — expert's "My Posts" w/ Filled/Expired controls (added to ExpertLandingPage)
- `src/components/dashboard/admin/JobPostsManager.tsx` — admin CRUD + industry list editor + approval toggle
- `src/components/dashboard/admin/JobBoardStatsCards.tsx` — Total Jobs Posted + Last 30 Days, added to `AdminStatsCards` block

**Nav:** Add "Jobs" entry to authenticated nav + mobile nav.

**Controlled lists (constants file `src/constants/jobBoard.ts`):**
- `EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Internship','Seasonal','Temporary']`
- `DEFAULT_INDUSTRIES = ['Sports & Recreation','Marketing & Media','Finance','Technology','Hospitality','Healthcare','Education','Nonprofit','Sales','Operations','Other']` (overridden by `job_board_settings.industries`)
- `REMOTE_STATUSES = ['Remote','Hybrid','On-site']`

## 4. Connection flow

No new code — JobCard's expert chip links to the existing expert profile route, where the existing Request Connection button handles everything.

## 5. Mobile

All new screens use existing responsive patterns (grid → stack, badges wrap, same Tailwind tokens). Filters collapse into a Sheet on mobile (matches existing pattern).

## Open questions

1. **Approval default off** — confirmed in spec, but should pending posts be visible to the posting expert before approval? (Assuming yes.)
2. **Industry list edits** — should renaming an industry retroactively update existing posts, or leave old values orphaned in filters? (Default: leave as-is, show all distinct values in filter.)
3. **Auto-archive** — needs `pg_cron` + `pg_net` enabled. OK to enable?

Approve and I'll ship it.



# Admin Summary Email Notifications (Daily/Weekly)

## Overview

Create a new edge function `send-admin-summary` that sends a comprehensive HTML email digest to admins who have opted into "daily" or "weekly" summaries via their `/settings` digest_frequency preference. The email mirrors the Analytics Dashboard layout with stats cards, chart data tables, top profiles, and recent users -- all rendered as styled HTML tables matching the existing email template style.

A cron job triggers the function daily. The function checks each admin's `digest_frequency` preference and only sends when appropriate (daily subscribers get it every day; weekly subscribers get it on Mondays only).

## What Changes

### 1. New Edge Function: `supabase/functions/send-admin-summary/index.ts`

A single self-contained function that:

1. Queries all admin users whose `digest_frequency` is `daily` or `weekly`
2. Skips weekly subscribers if today is not Monday
3. Fetches all dashboard data using the service role key:
   - `admin_analytics_summary` (stats cards)
   - `user_signups_by_day` (signups chart data)
   - `connections_by_day` (connections chart data)
   - `athletes_by_sport` (distribution)
   - `employers_by_industry` (distribution)
   - `top_athlete_profiles` (top 5)
   - `top_employer_profiles` (top 5)
   - `profiles` + `user_roles` (recent 10 users)
4. Renders a styled HTML email with the same visual structure as the dashboard screenshots:
   - **Header**: gradient banner "Analytics Summary"
   - **Stats Grid**: 6 metric cards (Total Users, Total Connections, Pending Requests, Rejected, Athlete Profiles %, Employer Profiles %)
   - **Charts Section**: Since email can't render interactive charts, these become styled HTML tables showing the raw data (signups by day, connections by day, athletes by sport counts, employers by industry counts)
   - **Top Profiles Tables**: Two side-by-side tables for top athletes and top employers
   - **Recent Users Table**: Name, Email, Role, Joined date
5. Uses the same email template styling as `send-role-notification` (gradient header, card layout, footer)
6. Sends via Resend with `RESEND_API_KEY_1`

### 2. Update `supabase/config.toml`

Add:
```toml
[functions.send-admin-summary]
verify_jwt = false
```

### 3. Set Up Daily Cron Job

Use `pg_cron` + `pg_net` to call the function every day at 9:00 AM UTC:

```sql
SELECT cron.schedule(
  'send-admin-summary-daily',
  '0 9 * * *',
  $$ SELECT net.http_post(
    url := 'https://fihcubajfjjbcjqiqqrv.supabase.co/functions/v1/send-admin-summary',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

### 4. Update Settings Page Labels

Remove "(coming soon)" text from the Daily and Weekly summary radio options since the feature will now be functional.

## Technical Details

### Email HTML Structure

The email uses the same inline-CSS table-based layout as the existing `send-role-notification`:
- Outer wrapper: `max-width: 600px`, white card with shadow, rounded corners
- Header: gradient blue banner
- Stats section: 2x3 grid using nested tables, each cell showing metric name + value + subtitle
- Data tables: striped rows with the same font/color scheme
- Charts become summary tables: e.g., "User Signups (Last 7 Days)" with Date | Athletes | Employers columns
- Footer: gray bar with org name

### Daily vs Weekly Logic

```
const today = new Date();
const isMonday = today.getUTCDay() === 1;

// For each admin:
// - digest_frequency === 'daily' -> always send
// - digest_frequency === 'weekly' -> only send if isMonday
```

### No Database Schema Changes

The `notification_preferences.digest_frequency` column already supports `'daily'` and `'weekly'` values. No migration needed.

### Data Limits

- Signups/connections chart data: last 7 days for daily, last 7 days for weekly
- Top profiles: limit 5
- Recent users: limit 10



## Overview

Two major changes:

### Part 1: Remove "pending" and "declined" statuses from UI
- When someone declines (or is declined), the `rejected` status is set in DB but the **requesting side** gets no notification and the button resets to "Request Connection" so they can re-send.
- The `rejected` status should still exist in DB (we don't want to delete history), but we need to:
  1. **Delete/reset the rejected record** when the other side tries to re-send, so a new pending request can be inserted.
  2. **Stop sending email notification** on rejection (remove `send-connection-notification` call for `request_declined` in both ConnectionRequestsManagers).
  3. **Remove "Declined Connections" section** from AthleteDashboard and EmployerDashboard connections view.
  4. **Update connection buttons** in `EmployerDirectory` and `AthleteDirectory` to treat `rejected` the same as no-request (clickable, "Request Connection").
  5. **Update Connection Activity cards** to remove "Declined" row — replace with just "Requests" (pending) and "Connections" (accepted) counts.
  6. After rejection, the existing request record should be **deleted** so the requester can send again. The simplest approach: when handling rejection, delete the record (not update to `rejected`). OR: update to `rejected` and then when the athlete/employer tries to send a new request, check if there's a `rejected` one and delete it first.

**Decision**: When a decline happens, **delete** the connection_request row entirely. This is simpler than keeping a `rejected` record that the UI needs to ignore. Benefits: clean DB, no need to filter, re-sending just works. We update `handleUpdateStatus` and `handleRejectRequest` to `DELETE` instead of `UPDATE status='rejected'`.

### Part 2: Activity Board in Connections view

**New table: `connection_activity_log`** — no, this adds complexity. Instead, we **repurpose the existing `connection_requests` table** and add an `updated_at` field (already exists). We'll query all requests (all statuses, not just pending) for the user's profile, including accepted ones, to build the activity history.

Actually `connection_requests` already has `created_at` and `updated_at`. We can derive events:
- A row being created = "Request Sent" or "Request Received" event (based on `initiated_by_user_id`).
- A row with `status='accepted'` = "Connection Made" event (use `updated_at`).

We **don't need a new table**. We query all connection_requests for the user's athlete/employer profile (all statuses) and reconstruct activity from the existing data.

**"New" badge logic**: A request is "new" if it was created within the last 7 days (or unread — but there's no read flag on connection_requests). Simple approach: a request is "new" if its `created_at` is within the last 7 days.

### Files to change

1. **`src/components/athlete/ConnectionRequestsManager.tsx`**: Change rejection to DELETE the record instead of updating to `rejected`. Remove email notification call on rejection.

2. **`src/components/employer/ConnectionRequestsManager.tsx`**: Same — rejection = DELETE, no email on rejection.

3. **`src/components/dashboard/AthleteDashboard.tsx`**: 
   - Change "connections" view to remove "Declined Connections" section.
   - Replace separate sections with new `ConnectionActivityBoard` component (shows activity log + connections list).

4. **`src/components/dashboard/EmployerDashboard.tsx`**: Same — remove declined section, add `ConnectionActivityBoard`.

5. **`src/components/dashboard/athlete/AthleteLandingPage.tsx`**: Update Connection Activity card — replace Pending/Accepted/Declined with "Requests" (total unique partners contacted) and "Connections" (accepted count). Update stats fetch accordingly.

6. **`src/components/dashboard/employer/PartnerLandingPage.tsx`**: Same stats card update.

7. **`src/components/athlete/EmployerDirectory.tsx`**: Already handles 3 states. Change `rejected` status (if it could appear) to not block button — but since we're now deleting on rejection, rejected rows won't exist, so this is effectively handled. Just make sure the Map only includes `pending` and `accepted`.

8. **NEW: `src/components/connections/ConnectionActivityBoard.tsx`**: A new shared component for the activity board tab. Shows:
   - Tabs: "All Activity" | "New" | "Existing"
   - Table grouped by date, sorted `created_at` desc
   - Columns: Counterpart name+email, Message, New badge (if within 7 days), Date/Time
   - Two sub-tabs or sections: Inbound / Outbound (or combined)

### Connection Activity Stats (dashboard cards)

Change from Pending/Accepted/Declined to:
- **Requests** = count of all connection_requests for the user's profile (both pending+accepted+any status — unique counterparts contacted/received)
- **Connections** = count of accepted requests

### Activity Board query

For **athletes**: query all `connection_requests` where `athlete_id = athleteProfileId`, join with `employer_profiles(company_name, contact_email)`. Each row can be:
- If `initiated_by_user_id = athleteUserId`: "Outbound request to [company]"
- Else: "Inbound request from [company]"
- If `status = 'accepted'`: show as "Connected"

For **employers**: query all `connection_requests` where `employer_id = employerProfileId`, join with `athlete_profiles(profiles(full_name, email))`.

Group by date(`created_at`), sort by `created_at` DESC.

"New" = `created_at` within last 7 days.

### Implementation Plan (ordered)

1. Create `src/components/connections/ConnectionActivityBoard.tsx` — the shared activity table component (takes `profileId`, `profileType: 'athlete' | 'employer'`, `userId`).
2. Update `AthleteLandingPage.tsx` — stats card: "Requests" + "Connections" only.
3. Update `PartnerLandingPage.tsx` — same stats card change.
4. Update `AthleteDashboard.tsx` — connections view: remove declined, add activity board as the primary content with tabs (Activity Board | Accepted Connections | Pending Requests).
5. Update `EmployerDashboard.tsx` — same connections view restructuring.
6. Update `athlete/ConnectionRequestsManager.tsx` — delete on rejection, no email.
7. Update `employer/ConnectionRequestsManager.tsx` — delete on rejection, no email.
8. No DB migration needed (using existing table data).

### Connections View Layout (both athlete and employer)

```
My Connections
[Tabs]
  [Activity Board] [Pending Requests] [Accepted Connections]

Activity Board tab:
  Filter: [All] [New] [Existing]
  
  --- March 5, 2026 ---
  | Recipient      | Message         | [New] | Date     |
  | John Smith     | Hi, I'd love... | ●New  | 2:30 PM  |
  
  --- March 3, 2026 ---
  | Nike Corp      | Interested in...| -     | 11:00 AM |
```

### "New" definition
A record is "new" if it was created within the last **7 days** (simple, no extra DB column needed).

### No DB migration needed
All data exists in `connection_requests`. The activity board reads all statuses of connection_requests for the current user's profile. Since we're deleting rejected records, the activity board will show only pending + accepted entries — which is exactly what we want (no declined clutter).

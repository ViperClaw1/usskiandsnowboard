
## Root cause — complete diagnosis

### Two DB triggers on `connection_requests` (previously unknown)

The database has TWO triggers on `connection_requests`:
1. `connection_notification_trigger` → calls `create_connection_notification()` — only inserts in-app notifications, harmless
2. `on_connection_request_event` → calls `notify_connection_event()` — fires `net.http_post` to `send-connection-notification`

These were always both present. The `connection_notification_trigger` does NOT cause duplicate emails since it doesn't call the edge function.

### Double invocation source for `new_request`

The `net._http_response` table shows request `id:1101` (from the DB trigger at `15:31:28`) **TIMED OUT** after 5000ms — but `net.http_post` is fire-and-forget: the HTTP request IS sent even if `net.http_post` times out waiting for the response. The edge function was invoked once by the DB trigger.

The edge function was also invoked a second time by a **browser client-side call** (confirmed by the `OPTIONS` CORS preflight in the logs, which DB triggers never send — they make direct server-side HTTP calls). This means there is still a client-side `supabase.functions.invoke("send-connection-notification", ...)` call being made.

### Three remaining client-side invoke calls NOT previously removed

The previous fix only removed calls from `EmployerDirectory.tsx` and `AthleteDirectory.tsx`. Three files still call the edge function directly:

1. **`src/components/connections/ConnectionActivityBoard.tsx`** line 233 — `request_accepted`
2. **`src/components/athlete/ConnectionRequestsManager.tsx`** line 156 — `request_accepted`
3. **`src/components/employer/ConnectionRequestsManager.tsx`** line 165 — `request_accepted`

These three cause duplicate `request_accepted` emails to stakeholders and double admin emails on acceptance.

Additionally, the `employer/AthleteDirectory.tsx` component is used to initiate `new_request` — the employer side can still have a stale client invoke if the file wasn't saved correctly, but the code review shows it IS cleaned up. The actual second `new_request` invocation came from `ConnectionActivityBoard.tsx`'s accept/decline path or another code path. However for the test request `5cd0d467` which is a `new_request`, the second invocation must be from elsewhere — likely a race condition where the DB trigger fires the function and separately another component is rendering and re-triggering. The OPTIONS preflight is definitive proof of a browser-side call.

### Why employer email is NULL (bug 2 — stakeholder emails not delivered)

For request `5cd0d467`, `employer_profiles.contact_email` is `NULL` for partner "Cardinal Lands". The edge function correctly reads `contact_email` from `employer_profiles`, which is `null` — so `employerEmail` is `null`. The email is silently skipped since `toAddresses` filters out nulls. 

The fix needs to **fall back to the auth user's email** from `profiles.email` when `contact_email` is null.

## Fixes

### Fix 1 — Remove the three remaining client-side invoke calls

Remove `supabase.functions.invoke("send-connection-notification", ...)` from:
- `src/components/connections/ConnectionActivityBoard.tsx` (lines 232–238)
- `src/components/athlete/ConnectionRequestsManager.tsx` (lines 155–162)
- `src/components/employer/ConnectionRequestsManager.tsx` (lines 164–171)

The DB trigger `on_connection_request_event` handles ALL three notification types (INSERT → `new_request`, UPDATE accepted → `request_accepted`, UPDATE rejected → `request_declined`) — no client-side invocation is needed.

### Fix 2 — Fall back to `profiles.email` when `contact_email` is null

In `supabase/functions/send-connection-notification/index.ts`, update the query to also fetch `profiles(email)` for the employer, and use it as a fallback when `contact_email` is null:

```ts
// current
const employerEmail = request.employer_profiles.contact_email;

// fix
const employerEmail = request.employer_profiles.contact_email 
  || request.employer_profiles.profiles?.email 
  || null;
```

The select query must be updated to include `profiles(email, full_name, first_name, last_name)` for employer (it already selects profiles but not `email`).

### Fix 3 — Add logging to confirm email addresses at send time

Add `console.log` statements before each `sendEmail` call to output the resolved `athleteEmail` and `employerEmail` — makes future debugging immediate.

### Fix 4 — Redeploy the edge function

After the code change, redeploy `send-connection-notification` so the updated fallback logic is live.

## Files changed

- `src/components/connections/ConnectionActivityBoard.tsx` — remove client-side invoke
- `src/components/athlete/ConnectionRequestsManager.tsx` — remove client-side invoke
- `src/components/employer/ConnectionRequestsManager.tsx` — remove client-side invoke
- `supabase/functions/send-connection-notification/index.ts` — add email fallback + debug logs

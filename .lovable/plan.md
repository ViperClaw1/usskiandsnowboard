
## Root cause analysis

### Bug 1 — Admin emails sent twice

The `send-connection-notification` function is being invoked **twice** for every `new_request` event:

1. **Database trigger** `on_connection_request_event` fires on every `INSERT` into `connection_requests` and calls `send-connection-notification` via `net.http_post`.
2. **Client-side code** in `EmployerDirectory.tsx` (line 332) and `AthleteDirectory.tsx` (line 390) **also** calls `supabase.functions.invoke("send-connection-notification", ...)` after inserting the request.

Both paths reach `notifyAdmins(...)` inside `send-connection-notification`, which calls `send-admin-notification` — so admins receive two emails every time.

The logs confirm this: there are two `Processing new_request notification...` log entries and two `Notified admins about new_connection_request` entries for request `e10eb1d7-...`.

### Bug 2 — Stakeholder (athlete/employer) emails stopped

The `shouldSendEmail` function (lines 92–93) gates on `digest_frequency`:

```ts
if (prefs.digest_frequency === "off") return false;
if (prefs.digest_frequency !== "instant") return false;
```

The default value in the `notification_preferences` table is `'instant'`. However, the `new_request` notification is only being checked against the **employer's** preferences. If the employer's `notification_preferences` row has any value other than `'instant'` — e.g., `'daily'`, `'weekly'`, or `'off'` — the email is silently skipped. This same gate also affects the employer on accepted/declined events.

More critically: the `request_accepted` path sends to **both** athlete and employer emails without calling `shouldSendEmail` for either — but the real culprit is likely that `contact_email` on the employer profile or `email` on the athlete profile is `null`, causing the `toAddresses` array to be empty, so no email is sent.

### Fix

**Remove the duplicate client-side invoke calls** — the database trigger already handles all connection events reliably. The client should just insert the row and let the trigger fire. This fixes the double admin emails and ensures a single clean flow.

**Fix `shouldSendEmail`** — `digest_frequency` values like `'daily'` or `'weekly'` should not block instant emails to stakeholders. The preference columns (`email_new_requests`, `email_accepted_connections`) are the correct gatekeepers; `digest_frequency` is only meaningful for digest/summary delivery and should not block live event emails.

### Files to change

1. `src/components/athlete/EmployerDirectory.tsx` — remove the `supabase.functions.invoke("send-connection-notification", ...)` call after insert (trigger handles it)
2. `src/components/employer/AthleteDirectory.tsx` — same removal
3. `supabase/functions/send-connection-notification/index.ts` — fix `shouldSendEmail` to not gate on `digest_frequency !== "instant"`, keeping only the specific preference columns as gates

### Exact changes

**`shouldSendEmail` fix** (remove the digest_frequency blocking lines):
```ts
// Before
if (prefs.digest_frequency === "off") return false;
if (prefs.digest_frequency !== "instant") return false;

// After — only respect the explicit per-event toggles
if (notificationType === "new_request" && !prefs.email_new_requests) return false;
if (notificationType === "request_accepted" && !prefs.email_accepted_connections) return false;
return true;
```

**`EmployerDirectory.tsx` and `AthleteDirectory.tsx`** — remove the `try { await supabase.functions.invoke("send-connection-notification", ...) }` block after the insert (the DB trigger already calls it).

No migration needed — this is purely a code fix.

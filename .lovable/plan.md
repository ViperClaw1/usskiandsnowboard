
## Two Problems to Solve

### Problem 1: Resend rate limit (2 req/s)

The `send-admin-notification` function calls `Promise.all(emailPromises)` which fires all admin emails simultaneously. On `request_accepted` in `send-connection-notification`, two emails are also fired back-to-back with `await ... await` (sequential but no gap). The fix is a small `sleep` utility that enforces a ≥600ms gap between consecutive `resend.emails.send` calls.

### Problem 2: Duplicated HTML template

The branded header block (mountain background, logo, title) is copy-pasted identically in:
- `send-connection-notification/index.ts` — 4 times (newRequest, acceptedAthlete, acceptedEmployer, declined)  
- `send-admin-notification/index.ts` — 4 times (newAccount, newRequest, accepted, declined)
- `invite-user/index.ts` — 1 time
- `resend-confirmation/index.ts` — 1 time

Total: **10 copies** of the exact same ~20-line header block.

The fix is a shared module at `supabase/functions/_shared/email-template.ts` (Deno supports relative imports across functions via the `_shared` convention). Each function then does `import { emailTemplate } from "../_shared/email-template.ts"`.

---

## Shared Template Design

```typescript
// supabase/functions/_shared/email-template.ts

export function emailTemplate(title: string, bodyHtml: string): string {
  // Returns full DOCTYPE..html with branded header + injected body + footer
}

export async function sendEmailWithRateLimit(
  resend: Resend,
  payload: { from: string; to: string[]; subject: string; html: string }
): Promise<void> {
  // Wraps resend.emails.send + ensures ≥600ms between calls
}
```

The `emailTemplate(title, bodyHtml)` function renders:
- Full `<!DOCTYPE html>` wrapper
- Branded header (mountain bg, logo, title)
- Body section (`bodyHtml` injected)
- Footer

Each per-email helper in `send-connection-notification` and `send-admin-notification` is rewritten to only produce the **body inner HTML** (the content inside the `<td style="padding: 40px 30px;">` cell), then wraps it with `emailTemplate(title, body)`.

---

## Rate Limit Fix

Replace `Promise.all(emailPromises)` in `send-admin-notification` with a sequential loop that awaits each send + sleeps 600ms before the next.

In `send-connection-notification`, the `request_accepted` branch sends two emails sequentially — add a 600ms sleep between them.

A single `sleep` helper lives in `_shared/email-template.ts`:
```typescript
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

---

## Files Changed

```
NEW   supabase/functions/_shared/email-template.ts
MOD   supabase/functions/send-connection-notification/index.ts
MOD   supabase/functions/send-admin-notification/index.ts
MOD   supabase/functions/invite-user/index.ts
MOD   supabase/functions/resend-confirmation/index.ts
```

No frontend files touched. No database changes. No secrets changes.

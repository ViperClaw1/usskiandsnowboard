
# Fix: Add Redirect URL to Auth Allowlist

## Root Cause

Supabase auth has a "Redirect URLs" allowlist. When `generateLink` specifies a `redirectTo`, Supabase checks it against this list. If the URL (with path) isn't allowed, it silently falls back to the base site URL. That's why the email link redirects to the home page instead of `/reset-password?invited=true`.

## Solution

Add the redirect URL patterns to the Supabase auth configuration so the `/reset-password` path is permitted.

### Step 1: Configure Auth Redirect URLs

Use the Supabase auth configuration to add these URLs to the allowed redirect list:
- `https://usskiandsnowboard.lovable.app/reset-password`
- `https://id-preview--6c20180f-3057-4b8f-a30d-347720c7006f.lovable.app/reset-password`

This can be done via the Lovable Cloud auth settings (adding allowed redirect URL patterns).

### Step 2: Verify the edge function URL construction

The edge function currently computes `appUrl` by replacing `.supabase.co` with `.lovable.app` in the Supabase URL, which produces `https://fihcubajfjjbcjqiqqrv.lovable.app`. This may differ from the published domain `usskiandsnowboard.lovable.app`. We should update the function to use the correct published app URL, or pass it as an environment variable / hardcode it. The most robust approach:
- Add a secret/env var `APP_URL` with the value `https://usskiandsnowboard.lovable.app`, or
- Hardcode the published URL in the function

### Summary of Changes

| What | Change |
|------|--------|
| Auth config | Add `/reset-password` redirect URL patterns to the allowed list |
| Edge function (`invite-user/index.ts`) | Use the correct published app URL instead of deriving it from the Supabase URL |

### No frontend changes needed

The `ResetPassword.tsx` and `Dashboard.tsx` changes from the previous implementation are correct and don't need modification. The issue is purely on the backend configuration side.

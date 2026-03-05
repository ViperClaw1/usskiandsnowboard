
## Plan: Block OAuth signups at the database level via Supabase Auth Hook

### The Problem
The current client-side approach in `Auth.tsx` has a race condition: Supabase creates the OAuth user and issues a session *before* `onAuthStateChange` fires. So the user briefly exists in the auth system and a session token is issued before we can sign them out. The only truly correct fix is a server-side gate.

### The `block_oauth_signup` function
A `block_oauth_signup` PL/pgSQL function already exists in the database — it checks `raw_app_meta_data->>'provider' != 'email'` and raises an exception. But it's orphaned — it's not attached to anything.

### Solution: Wire it as a Supabase `before_user_created` Auth Hook

Supabase's **Auth Hooks** (available since Supabase v2) let you intercept the user creation flow via a `postgres` function that runs *before* the user row is committed. The hook must:
1. Live in the `public` schema (or `auth` schema accessible by the hook system)
2. Accept a `jsonb` event argument
3. Return a `jsonb` response — returning `{ "error": { ... } }` blocks the signup

This is done via a migration that calls:
```sql
SELECT vault.create_secret(...) -- not needed
-- or via:
ALTER ROLE authenticator SET ...
-- Actually via:
SELECT supabase_functions.http_hooks_enabled ...
```

Wait — Supabase Auth Hooks are configured through the Supabase Dashboard's "Authentication > Hooks" UI, OR via `config.toml`. Since this is Lovable Cloud, we don't have dashboard access. We can configure it via `supabase/config.toml`.

### Correct Approach for Lovable Cloud

Looking at the config.toml, it only has function-level settings. Auth hooks in Supabase are configured through:

**Option A: `config.toml` auth hooks** — Supabase supports `[auth.hook.custom_access_token]` etc. in config.toml, but `before_user_created` hooks specifically require an Edge Function, not a SQL function, when configured via config.toml.

**Option B: Edge Function as auth hook** — Create `supabase/functions/block-oauth-signup/index.ts` that:
- Receives the Supabase auth hook payload
- Checks if `record.raw_app_meta_data.provider !== 'email'`
- Returns `{ "error": { "http_code": 422, "message": "..." } }` to block
- Configure it in `config.toml` under `[auth.hook.before_user_created]`

**Option C: Database-level hook via migration** — Wire the existing `block_oauth_signup` function as a before-insert trigger on `auth.users`. However, the instructions say we must never touch the `auth` schema.

**Option B is the correct, safe, supported approach for Lovable Cloud.**

### Implementation

#### 1. New Edge Function: `supabase/functions/block-oauth-signup/index.ts`
```typescript
Deno.serve(async (req) => {
  const payload = await req.json()
  const user = payload.user

  // Block if provider is not email (i.e., OAuth)
  if (user?.app_metadata?.provider && user.app_metadata.provider !== 'email') {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 422,
          message: "Sign-up via Google or Apple is not available. Please use an invite code or join the waitlist."
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Allow all other signups
  return new Response(
    JSON.stringify({}),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

#### 2. Register in `supabase/config.toml`
```toml
[auth.hook.before_user_created]
enabled = true
uri = "pg-functions://postgres/public/block_oauth_signup_hook"
```

Wait — Supabase's before_user_created hook URI format differs. For Edge Functions, it's:
```toml
[auth.hook.before_user_created]
enabled = true
uri = "https://<project_ref>.supabase.co/functions/v1/block-oauth-signup"
secrets = "BLOCK_OAUTH_SIGNUP_HOOK_SECRET"
```

But since this is Lovable Cloud, the project URL isn't exposed and config.toml changes may or may not take effect for auth hooks depending on whether Lovable Cloud supports this.

**The most reliable fallback**: Use a **PostgreSQL function hook** which is natively supported.

For `pg-functions://` style hooks, the function signature must be:
```sql
CREATE OR REPLACE FUNCTION public.block_oauth_signup_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF event->'user'->'app_metadata'->>'provider' IS DISTINCT FROM 'email' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 422,
        'message', 'Sign-up via Google or Apple requires an invite. Please use an invite code or apply via the waitlist.'
      )
    );
  END IF;
  RETURN '{}';
END;
$$;
```

And in `config.toml`:
```toml
[auth.hook.before_user_created]
enabled = true
uri = "pg-functions://postgres/public/block_oauth_signup_hook"
```

This is the cleanest, most reliable solution and doesn't require an extra deployed edge function.

#### 3. Update `Auth.tsx` — simplify the `onAuthStateChange` handler
Since blocking now happens at the DB level, remove the `isNewOAuthUser` heuristic. Instead, catch the auth error returned by Supabase when the hook blocks signup. The SSO buttons call `lovable.auth.signInWithOAuth(...)` — if the hook blocks a new user, the OAuth callback will fail with an error message. Catch this in the redirect URL handling or in `onAuthStateChange` where if the event is a login error due to hook rejection, show the toast.

Actually, when a `before_user_created` hook returns an error, Supabase redirects back to the app's redirect URI with `?error=...&error_description=...` query params. We need to read these in `Auth.tsx` `useEffect` and show a toast.

### Summary of changes

1. **Migration**: Create `block_oauth_signup_hook(event jsonb) RETURNS jsonb` function
2. **`supabase/config.toml`**: Add `[auth.hook.before_user_created]` section
3. **`src/pages/Auth.tsx`**: Add a `useSearchParams`-based effect to detect `?error=` and `?error_description=` in the URL on page load, show a toast, clear the URL params, and keep the user on the landing step. Keep the existing `onAuthStateChange` guard as a secondary safety net.

### Files to change
- `supabase/migrations/<new>.sql` — new hook function
- `supabase/config.toml` — register the hook
- `src/pages/Auth.tsx` — handle error redirect from OAuth

---

**Note on `config.toml` for Lovable Cloud**: The `[auth.hook.before_user_created]` setting in config.toml is a standard Supabase feature. Since Lovable Cloud uses a real Supabase project (`fihcubajfjjbcjqiqqrv`), this config should be applied when the project is deployed. If Lovable Cloud's CI doesn't apply config.toml auth hooks, the database-level trigger approach on `auth.users` BEFORE INSERT is the next option — but that's forbidden per instructions. We'll proceed with config.toml + pg-functions hook as the standard approach.

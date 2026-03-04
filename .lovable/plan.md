
## Plan: Block new SSO signups, redirect to landing with toast

### Problem
When a user clicks "Continue with Google/Apple" on the sign-in screen, Supabase/Lovable Cloud automatically creates a new account for unrecognised emails. This lets new users completely bypass the invite code gate or the waitlist flow.

### Detection approach
The most reliable server-side signal we already have: **existing approved users always have a row in `user_roles`**. A user who just signed up via SSO for the first time will have no such row. So after OAuth redirects back:

1. `onAuthStateChange` fires with a session.
2. Before navigating to `/dashboard`, query `user_roles` for the logged-in user's `user_id`.
3. If **no role row exists** → this is an unauthorised new SSO user → sign them out immediately, show a descriptive toast, reset step to `"landing"`.
4. If a role row **does exist** → existing approved user → proceed to `/dashboard` as normal.

### Changes to `src/pages/Auth.tsx` only

**1. Replace the current `onAuthStateChange` effect (lines 199-209)** with a version that:
- On session arrival, checks `user_roles` for the `user_id`.
- If no role → calls `supabase.auth.signOut()`, shows a `toast.error(...)` explaining they must sign up through the platform's invite/waitlist process, and keeps the user on the landing step.
- If role found → navigates to `/dashboard`.

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
    if (!session?.user) return;

    // Check if this user has an approved role (i.e., went through proper onboarding)
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleRow) {
      // No role = brand-new SSO signup — block them and sign out
      await supabase.auth.signOut();
      setOauthLoading(null);
      setStep("landing");
      toast.error(
        "Sign up is only available through an invite code or the waitlist. Please use the 'Join the Platform' option.",
        { duration: 6000 }
      );
      return;
    }

    navigate("/dashboard");
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) navigate("/dashboard");
  });

  return () => subscription.unsubscribe();
}, [navigate]);
```

**Key details:**
- `maybeSingle()` is used instead of `single()` so no error is thrown when 0 rows are returned.
- `setOauthLoading(null)` ensures the spinner stops when blocked.
- The `getSession()` check at the bottom only applies to already-authenticated returning users, so it does **not** re-trigger the role check for them (they already passed it on first login).
- No other files need changes — the SSO buttons are already hidden on non-sign-in steps.

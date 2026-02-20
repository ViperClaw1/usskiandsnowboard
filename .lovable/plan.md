
# Fix: 403 "User from sub claim in JWT does not exist" on Password Reset

## Root Cause

In `supabase/functions/invite-user/index.ts`, the admin-created user has `email_confirm: false`. When the invited user clicks the direct link and `verifyOtp` establishes a recovery session, the unconfirmed email status causes Supabase to reject the subsequent `updateUser({ password })` call with a 403.

## Fix

**File: `supabase/functions/invite-user/index.ts`**

Change `email_confirm: false` to `email_confirm: true` in the `createUser` call (around line 120). Since the admin is inviting this user, email confirmation is unnecessary -- the admin has already verified the user's identity.

```typescript
// Before
email_confirm: false,

// After
email_confirm: true,
```

This single change ensures the user account is fully activated at creation time, so the recovery JWT session works correctly when the user sets their password.

## Why This Is Safe

- Admin-invited users don't need to verify their email -- the admin vouches for them
- The password-setting step via the direct link already acts as proof of email ownership
- No other files need changes; the frontend logic in `ResetPassword.tsx` and `Dashboard.tsx` is correct

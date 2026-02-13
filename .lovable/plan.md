

# Make Role Dropdown Actionable + Email Notification

## Overview

The role grant dropdown in the User Management table already has working logic in `UserRoleManager.tsx` (mutations to insert/delete from `user_roles`, toast alerts, confirmation dialogs). The screenshot confirms the dropdown renders correctly. The main addition needed is **sending an email notification** when a role is changed.

## Changes

### 1. Create new edge function: `supabase/functions/send-role-notification/index.ts`

A new backend function that sends an email via Resend when an admin changes a user's role.

- Accepts: `{ user_email, user_name, new_role, action }` (action = "grant" or "revoke")
- Uses Resend with the same sender pattern as other functions (`onboarding@resend.dev`)
- Styled HTML email informing the user their role was updated
- CORS headers for browser calls
- Returns success/error JSON

### 2. Update `supabase/config.toml`

Add `[functions.send-role-notification]` with `verify_jwt = false` (called from authenticated admin context, but the function itself doesn't need JWT verification since it's invoked server-side via the Supabase client).

### 3. Update `src/components/dashboard/admin/UserRoleManager.tsx`

- In the `onSuccess` callbacks of both `grantRoleMutation` and `revokeRoleMutation`, invoke the new `send-role-notification` edge function
- Pass the user's email, name, the role, and the action (grant/revoke)
- Fire-and-forget: don't block the toast on email success (show toast immediately, send email in background)

## Technical Details

### Edge Function Structure

```
send-role-notification/index.ts
- CORS preflight handler
- Accepts POST with { user_email, user_name, new_role, action }
- Sends styled HTML email via Resend
- Returns { success: true }
```

### Email Content

- **Subject (grant):** "Your role has been updated - US Ski & Snowboard"
- **Subject (revoke):** "Role update notification - US Ski & Snowboard"
- **Body:** Informs the user which role was granted/revoked, with a link to the dashboard

### UserRoleManager Changes

Add an async call after each successful mutation:

```typescript
// In onSuccess of grantRoleMutation:
supabase.functions.invoke('send-role-notification', {
  body: { user_email: userEmail, user_name: userName, new_role: role, action: 'grant' }
});
```

Same pattern for revokeRoleMutation with `action: 'revoke'`.

## No Database Changes Required

The `user_roles` table and mutations already work correctly. Only the email notification is new.


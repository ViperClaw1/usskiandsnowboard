

# Fix: Resend Confirmation Email for Admin Users

## Problem

The current `resendConfirmationMutation` calls `supabase.auth.resend({ type: 'signup', email })` from the browser using the public (anon) key. This API is designed for users to resend their **own** confirmation — it silently succeeds but sends nothing when an admin tries to use it for another user's email.

## Solution

Create a backend function that uses the service-role key to generate a confirmation link and send the email via Resend.

### 1. New backend function: `supabase/functions/resend-confirmation/index.ts`

- Accept `{ email }` in the request body
- Verify the caller is an admin (check `user_roles` table)
- Use `supabase.auth.admin.generateLink({ type: 'signup', email })` to get a confirmation URL
- Send the confirmation email using Resend (same HTML template as `send-confirmation-email`)
- Return success/error response

### 2. Update `src/components/dashboard/admin/FullUserManagementTable.tsx`

- Change `resendConfirmationMutation` to call the new backend function via `supabase.functions.invoke('resend-confirmation', { body: { email } })` instead of `supabase.auth.resend()`
- Handle error responses from the function

## Technical Details

**Backend function outline:**
```
1. Authenticate caller via Authorization header
2. Check caller has admin role in user_roles table
3. Call auth.admin.generateLink({ type: 'signup', email })
4. Extract the confirmation URL from the response
5. Send email via Resend with the same branded template
6. Return { success: true }
```

**Frontend change** (single mutation update):
```
// Before
supabase.auth.resend({ type: 'signup', email })

// After
supabase.functions.invoke('resend-confirmation', { body: { email } })
```

## What Stays the Same

- The email template styling and branding (reused from send-confirmation-email)
- The mail icon button in the user table
- The success/error toast messages
- All other admin user management functionality

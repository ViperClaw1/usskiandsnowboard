

# Fix Email Sending 403 Errors

## Problem

Three separate issues are preventing emails from being delivered:

1. **Domain typo**: Three edge functions send from `notifications@athleteconnect.org`, but the verified Resend domain is `athleteconnection.org` (with "ion"). This causes the 403 error.

2. **Sandbox sender**: Five edge functions still use `onboarding@resend.dev` (Resend's sandbox), which only delivers to the account owner's email address -- not to real users.

3. **Wrong secret name**: Two edge functions reference `RESEND_API_KEY_1`, which does not exist. Only `RESEND_API_KEY` is configured.

## Fix

Update all 8 edge functions to use:
- **From address**: `notifications@athleteconnection.org` (the verified domain)
- **Secret name**: `RESEND_API_KEY` (the one that actually exists)

### Files to Update

| File | Current "from" | Current secret | Changes |
|------|---------------|----------------|---------|
| `resend-confirmation/index.ts` | `notifications@athleteconnect.org` | `RESEND_API_KEY` | Fix domain typo |
| `send-role-notification/index.ts` | `notifications@athleteconnect.org` | `RESEND_API_KEY_1` | Fix domain typo + fix secret name |
| `send-admin-summary/index.ts` | `notifications@athleteconnect.org` | `RESEND_API_KEY_1` | Fix domain typo + fix secret name |
| `send-confirmation-email/index.ts` | `onboarding@resend.dev` | `RESEND_API_KEY` | Fix from address |
| `send-temp-password/index.ts` | `onboarding@resend.dev` | `RESEND_API_KEY` | Fix from address |
| `send-admin-notification/index.ts` | `onboarding@resend.dev` | `RESEND_API_KEY` | Fix from address |
| `send-connection-notification/index.ts` | `onboarding@resend.dev` | `RESEND_API_KEY` | Fix from address |
| `invite-user/index.ts` | `onboarding@resend.dev` | `RESEND_API_KEY` | Fix from address |

All functions will be updated to:
- From: `U.S. Ski & Snowboard <notifications@athleteconnection.org>`
- Secret: `RESEND_API_KEY`

No database changes needed. The edge functions will be redeployed automatically after the code changes.


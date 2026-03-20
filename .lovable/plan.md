
## Root cause — definitive

### Bug 1: `new_request` always sends to the employer, never to the athlete

In `send-connection-notification/index.ts`, the `new_request` branch unconditionally sends the "new connection request" email to `employerEmail`. This is wrong when the **employer** is the initiator — in that case, the **athlete** is the recipient and should get the email.

The `initiated_by_user_id` field on the request row identifies who initiated. The email must go to the **other party** (the recipient, not the initiator):

```
if employer initiated → send to athlete
if athlete initiated  → send to employer  ← currently the only path
```

The fix: read `initiated_by_user_id` and compare to `athleteUserId` / `employerUserId` to decide who to email.

### Bug 2: `request_accepted` was never tested with the current deployment

All real acceptances happened before today's redeployment. There are no `request_accepted` logs for the new build, so we cannot confirm if it works. However, the code path for `request_accepted` sends to `toAddresses = [athleteEmail, employerEmail]` as a single email with both in the `to` field — which is correct for the joint introduction email. The `shouldSendEmail` check is not called for `request_accepted`, so preferences don't block it. This path looks correct in the current code.

### Bug 3 (contributing): `shouldSendEmail` is called for `new_request` using the employer's userId — but when the employer initiates, `shouldSendEmail` is still called on the employer, not on the athlete who is the recipient

After the fix for Bug 1, we must also pass the **recipient's** userId to `shouldSendEmail`, not always the employer's.

## Fix — single file change in the edge function

In `supabase/functions/send-connection-notification/index.ts`, replace the `new_request` block (lines 264–281) with logic that:

1. Determines the **recipient** (non-initiator) from `initiated_by_user_id`
2. Sends the email to the recipient's email address
3. Calls `shouldSendEmail` against the recipient's userId
4. Adds an "athlete receives new request from employer" email body builder for when the athlete is the recipient

### Specific change

```ts
// Current (always sends to employer):
const sendEmail_ = employerUserId ? await shouldSendEmail(supabase, employerUserId, "new_request") : true;
if (sendEmail_ && employerEmail) {
  await sendEmail(resend, { ..., to: [employerEmail], ... });
}

// Fix (sends to the recipient — whoever did NOT initiate):
const recipientIsAthlete = request.initiated_by_user_id === employerUserId;
const recipientEmail    = recipientIsAthlete ? athleteEmail    : employerEmail;
const recipientUserId   = recipientIsAthlete ? athleteUserId   : employerUserId;
const recipientName     = recipientIsAthlete ? athleteFullName : companyName;
const senderName        = recipientIsAthlete ? companyName     : athleteFullName;

const shouldSend = recipientUserId
  ? await shouldSendEmail(supabase, recipientUserId, "new_request")
  : true;

if (shouldSend && recipientEmail) {
  const emailBody = recipientIsAthlete
    ? athleteNewRequestBody(recipientName, senderName, request, appUrl)  // new helper
    : newRequestBody(companyName, athleteFullName, request, appUrl);     // existing
  await sendEmail(resend, {
    from: FROM,
    to: [recipientEmail],
    subject: recipientIsAthlete
      ? `New Connection Request from ${senderName}`
      : `New Connection Request from ${athleteFullName}`,
    html: emailTemplate("New Connection Request", emailBody),
  });
  console.log(`New request email sent to ${recipientEmail}`);
}

// SMS: send to recipient
const smsUserId = recipientIsAthlete ? athleteUserId : employerUserId;
if (smsUserId) { ... }
```

A new `athleteNewRequestBody` helper is added that greets the athlete and shows the company details (mirrors `newRequestBody` but inverted).

## Files changed

- `supabase/functions/send-connection-notification/index.ts` — fix `new_request` routing + add athlete-facing email body
- Redeploy the function after the change

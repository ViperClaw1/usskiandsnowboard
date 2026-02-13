

# SMS Notifications Using Twilio for Connection Request Events

## Overview

Implement SMS notifications via Twilio for connection request events (new request, accepted, declined) alongside existing email notifications. Users can enable SMS in their Settings page and will receive text alerts when they have opted in.

## Key Implementation Points

### 1. **Twilio Integration Setup**

**Secrets Required** (to be added):
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_PHONE_NUMBER`: Twilio phone number for sending SMS

**Provider Requirements**:
- A2P 10DLC Registration with Twilio for US compliance and reliable delivery
- Brand and campaign verification required for US numbers
- SMS character limit: 160 characters (or 2-3 segments for longer messages)

### 2. **Update Edge Function: `send-connection-notification/index.ts`**

Add a helper function to send SMS via Twilio alongside existing email logic:

**New Logic Flow**:
- After fetching user notification preferences, also fetch their phone number from `profiles.phone`
- Check `sms_notifications_enabled` flag in `notification_preferences`
- If SMS enabled AND phone number exists AND SMS check passes → call Twilio API
- SMS message content (concise, <160 chars):
  - **new_request**: "New connection request from {athleteName} on US Ski & Snowboard. Log in to your dashboard to review."
  - **request_accepted**: "Great news! {companyName} accepted your connection request. Check your dashboard to connect."
  - **request_declined**: "{companyName} declined your connection request. Keep exploring other opportunities!"

**Implementation Details**:
- Create a `shouldSendSMS` helper function (similar to `shouldSendEmail`) that checks preferences
- Extract phone numbers from both `athlete_profiles.phone` and `employer_profiles` contact phone (if available)
- Use E.164 format for phone numbers (already stored in database)
- Fire-and-forget SMS calls: send SMS asynchronously without blocking main response
- Gracefully handle Twilio failures (log and continue, don't fail main notification)

### 3. **Twilio API Integration Pattern**

Use Twilio REST API for SMS:
```
POST https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages
Body: {
  From: TWILIO_PHONE_NUMBER,
  To: recipient_phone,
  Body: "SMS text"
}
Auth: Basic auth with ACCOUNT_SID:AUTH_TOKEN
```

### 4. **No Database Schema Changes Required**

- `profiles.phone` already stores user phone numbers in E.164 format
- `notification_preferences.sms_notifications_enabled` already exists (boolean flag)
- No new tables or columns needed

### 5. **UI Integration (Settings Page)**

The `/settings` page already has:
- Phone number input with validation (US format +1 XXX-XXX-XXXX)
- SMS toggle that requires phone number to be set first
- Save functionality for phone number

**No changes needed** to Settings page – SMS infrastructure already present.

### 6. **Implementation Sequence**

**Step 1**: Request Twilio secrets from user (Account SID, Auth Token, Phone Number)

**Step 2**: Update `send-connection-notification/index.ts`:
- Add Twilio secrets at top
- Create `shouldSendSMS()` helper function
- Create `sendTwilioSMS()` async function that calls Twilio API
- Integrate SMS calls into each notification type (new_request, request_accepted, request_declined)
- Handle both athlete and employer phone numbers appropriately
- Add comprehensive logging for SMS delivery

**Step 3**: Test end-to-end:
- Go to Settings, enable SMS, add phone number
- Send a connection request and verify SMS is received
- Accept/decline request and verify SMS is received

## Technical Considerations

**Phone Number Handling**:
- Phone numbers stored as E.164 (+1XXXXXXXXXX format)
- Use directly from database – no reformatting needed for Twilio

**Error Handling**:
- Twilio API failures should not block email notifications
- Log SMS failures for debugging
- Return success even if SMS fails (non-critical channel)

**Character Limits**:
- Keep SMS messages under 160 characters for single-segment delivery
- Segment count affects pricing and delivery speed

**Recipient Logic**:
- **new_request**: Send SMS to recipient (employer receiving athlete request)
- **request_accepted**: Send SMS to both parties
- **request_declined**: Send SMS to initiator only

## Edge Function Code Structure

```typescript
// New imports
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

// New helper functions
async function shouldSendSMS(userId, userPhone) { ... }
async function sendTwilioSMS(toPhone, message) { ... }

// Integration in main handler
if (notification_type === "new_request") {
  // Existing email logic...
  
  // New SMS logic
  if (employerUserId && employerPhone && await shouldSendSMS(employerUserId, employerPhone)) {
    await sendTwilioSMS(employerPhone, smsMessage);
  }
}
```

## No UI Changes Required

Settings page already fully supports SMS:
- Phone number collection ✓
- Phone validation ✓
- SMS toggle ✓
- Error handling ✓


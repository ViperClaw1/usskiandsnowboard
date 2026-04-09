

## Align Expert Connection Email Templates with Partner Flow

### Summary

Rewrite the three notification types in `send-expert-connection-notification/index.ts` so that:

1. **request_created** — Uses the structured "New Connection Request" card template (matching the athlete-partner `newRequestBody` pattern): expert profile card with name, expertise, message, and a "Review Request" CTA button. Sent TO the expert, CC admin.

2. **request_accepted** — Uses the current `request_created` introduction template (the joint "Please meet..." email sent to BOTH athlete and expert, CC admin). This is the same introductory format currently in the expert notification function.

3. **request_declined** — No changes, keeps the current template.

### Changes (single file)

**`supabase/functions/send-expert-connection-notification/index.ts`**

- **request_created** block (lines 136-182): Replace the inline introduction-style body with a structured card template mirroring `newRequestBody` from the partner flow:
  - "Hello [Expert], You have received a new connection request from [Athlete]!"
  - Profile card showing athlete name, sport, bio (fetched from athlete_profiles), and the optional message
  - "Review Request" button linking to `/dashboard`
  - Sent TO expert only, CC admin
  - Need to also fetch `bio` from athlete_profiles — update the select query (line 85-91) to include `bio`

- **request_accepted** block (lines 183-220): Replace the simple "approved" notification with the joint introduction email (the current `request_created` body):
  - Addressed to expert first name, introduces athlete with sport
  - Addressed to athlete first name, introduces expert with area_of_expertise/job_title
  - Includes original message if present
  - "Expert will take it from here" closing
  - Sent TO both athlete AND expert, CC admin
  - Subject becomes `"[Athlete] <> [Expert] — Athlete Connection Introduction"`

- **request_declined** block: No changes.

- **Query update** (line 85-91): Add `bio` to `athlete_profiles` select fields.

### Technical Details

- The `appUrl` constant (`https://usskiandsnowboard.lovable.app`) will be added for the CTA button URL.
- For `request_accepted`, the `to` array will include both `expertEmail` and `athleteEmail` (filtering nulls), matching the partner flow's `introductionBody` pattern.
- The function will be redeployed after changes.


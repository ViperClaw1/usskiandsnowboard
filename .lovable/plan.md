
## Plan: Introduction email on successful connection

### What changes

Replace the two separate acceptance emails (one to athlete, one to employer) with a **single joint introduction email** sent to both parties simultaneously, CCing `michele.lowry@usskiandsnowboard.org`.

Only `supabase/functions/send-connection-notification/index.ts` needs to change. The shared `emailTemplate` is reused as-is.

---

### Data needed (query update)

The existing select query must be expanded to pull:
- `athlete_profiles`: add `profiles(full_name, first_name, last_name)` — already has `full_name`, just add first/last
- `employer_profiles`: add `contact_person`, `contact_title` — so we can derive the rep's first/last name

Updated select:
```typescript
.select(`
  *,
  athlete_profiles (email, sport_discipline, bio, user_id, phone, profiles (full_name, first_name, last_name)),
  employer_profiles (company_name, industry, about, contact_email, contact_person, contact_title, user_id, phone, profiles (full_name, first_name, last_name))
`)
```

---

### Name resolution logic

**Athlete name**: Use `athlete_profiles.profiles.first_name` / `last_name`. Fall back to splitting `full_name` if those are null.

**Employer rep name**: Use `employer_profiles.contact_person` (a free-text field containing the rep's full name). Split on first space to derive first/last. The `employer_profiles.profiles` join gives the account owner's name as fallback.

**Employer rep title**: `employer_profiles.contact_title`

---

### New email: subject line

```
[Partner Company Name] <> [Athlete First] [Athlete Last] — Athlete Connection
```

### New email body function

```typescript
function introductionBody(
  athleteFirstName: string,
  athleteLastName: string,
  athleteSport: string,
  repFirstName: string,
  repLastName: string,
  repTitle: string,
  companyName: string,
): string
```

Body renders as plain, clean prose (using the same branded `emailTemplate` wrapper):

```
[Rep First Name],

Please meet [Athlete First] [Athlete Last], an accomplished professional [Sport] athlete and member of the US Ski & Snowboard.

[Athlete First Name],

Please meet [Rep First] [Rep Last], a [Rep Title] at [Company Name].

[Rep First Name] will take it from here to introduce themselves and find time to connect.

Cheers,

US Ski & Snowboard Athlete Development Team
```

---

### Resend CC field

The Resend SDK accepts a `cc` field on `emails.send()`. Update the `EmailPayload` interface in `_shared/email-template.ts` to add optional `cc?: string[]`, and pass it through in `sendEmail()`.

### Sending logic changes (in `request_accepted` branch)

**Remove**: Both separate `acceptedAthleteBody` + `acceptedEmployerBody` email sends and the `sleep(1000)` between them.

**Add**: One `sendEmail` call with:
- `to: [athleteEmail, employerEmail].filter(Boolean)` — sends to both
- `cc: ["michele.lowry@usskiandsnowboard.org"]`
- Subject: `${companyName} <> ${athleteFirstName} ${athleteLastName} — Athlete Connection`
- HTML: `emailTemplate("You're Connected!", introductionBody(...))`

Only skip the email if neither party has an email address. The existing `shouldSendEmail` check per-user is replaced by a single send (the introduction email is always sent on acceptance — it's a functional notification, not a preference-gated marketing email).

The SMS notifications and `notifyAdmins` calls remain unchanged.

---

### Files to change

1. **`supabase/functions/_shared/email-template.ts`** — add `cc?: string[]` to `EmailPayload`, pass to `resend.emails.send()`.
2. **`supabase/functions/send-connection-notification/index.ts`** — update query select, add `introductionBody()` function, replace dual acceptance emails with single intro email, remove `acceptedAthleteBody`/`acceptedEmployerBody` (or keep for reference, but they won't be called).

No DB migration needed. No new secrets needed.

---

### Email title for the branded header

`"You're Connected!"` — keeps the positive branded tone in the hero header.

### Edge case: missing rep name

If `contact_person` is blank and `employer_profiles.profiles.full_name` is also blank → fall back to `"The team"` for rep first name, empty string for last name, and `""` for title.

If sport discipline is blank → use `"athlete"` as the sport descriptor.

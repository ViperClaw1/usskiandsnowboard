
# Athlete AI Scraping: Switch to Instagram + Fix Instagram Link Blocking

## Issue 1: Switch athlete scraping from LinkedIn to Instagram

Currently, the AI profile populator asks athletes for their LinkedIn URL. We need to change this to Instagram.

### Changes

**File: `src/components/profile/AIProfilePopulator.tsx`**
- Change the athlete URL label from "LinkedIn Profile URL" to "Instagram Profile URL"
- Change placeholder from `https://www.linkedin.com/in/username` to `https://www.instagram.com/username`

**File: `supabase/functions/ai-populate-profile/index.ts`**
- Update the athlete system prompt to reference Instagram instead of LinkedIn
- The AI tool schema already has `instagram_url` as a field, so extraction will work as-is

---

## Issue 2: Instagram links blocked (`ERR_BLOCKED_BY_RESPONSE`)

This is **not caused by your code or by private profiles**. Instagram sets an `X-Frame-Options: DENY` HTTP header, which prevents any page from loading inside an iframe. Since the Lovable preview runs your app inside an iframe, `target="_blank"` links to Instagram get intercepted and blocked.

**On your published site** (`usskiandsnowboard.lovable.app`), Instagram links will open normally in a new tab.

No code change is needed for this -- it is a preview-environment limitation only. You can verify by testing on the published URL.

---

## Technical Details

### AIProfilePopulator.tsx (lines 38-39)
```typescript
// Before
const urlLabel = isEmployer ? "Company Website" : "LinkedIn Profile URL";
const urlPlaceholder = isEmployer ? "https://www.example.com" : "https://www.linkedin.com/in/username";

// After
const urlLabel = isEmployer ? "Company Website" : "Instagram Profile URL";
const urlPlaceholder = isEmployer ? "https://www.example.com" : "https://www.instagram.com/username";
```

### Edge function system prompt (ai-populate-profile/index.ts)
```typescript
// Before
`You are extracting athlete profile information from a LinkedIn profile...`

// After
`You are extracting athlete profile information from an Instagram profile...`
```

Note: Instagram public profiles can be scraped by Firecrawl. For private profiles, the AI will extract what it can from the limited public info (username, bio, profile photo) and fill remaining fields with reasonable suggestions based on the athlete's name and winter sports context -- this is already how the system prompt is configured.

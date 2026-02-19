
# AI Auto-Populate Profile Feature

## Overview
Add a "Complete with AI" button on the dashboard that lets users skip manual onboarding by providing a URL (website for partners, LinkedIn for athletes). The system scrapes the URL, processes it with AI, and auto-fills the entire profile.

## User Flow

**Partners (Employers):**
1. User sees "Complete with AI" button with sparkle icon below the "Complete your profile" link in the hero section
2. Clicks it -- a dialog opens asking for Company Name and Website URL
3. Clicks "Auto-fill my profile" -- loading popup appears with animated progress and friendly messaging
4. Backend scrapes the website via Firecrawl, sends content to Lovable AI to extract structured profile data
5. Profile is updated in the database, dialog shows success, profile completeness reaches 100%

**Athletes:**
1. Same button placement
2. Dialog asks for Full Name and LinkedIn Profile URL
3. Same scraping and AI extraction flow, but extracts athletic profile fields (sport, bio, skills, career interests, etc.)

**Admin:** Admins don't have a profile to complete (they manage the platform), so this feature will apply to athlete and partner roles only.

## Technical Approach

### Why Firecrawl + Lovable AI (not Perplexity)
- **Firecrawl** is already connected and handles scraping with JavaScript rendering and bot-bypass -- perfect for extracting raw content from any website or LinkedIn public page
- **Lovable AI** (google/gemini-3-flash-preview) handles the structured extraction via tool calling -- no extra API key needed, cost-effective, fast
- This combo gives the best accuracy (real scraped data) at lowest cost (one Firecrawl scrape + one AI call)

### New Files

**1. Edge Function: `supabase/functions/ai-populate-profile/index.ts`**
- Accepts: `{ role, url, name }` 
- Step 1: Scrapes the URL via Firecrawl API (using existing `FIRECRAWL_API_KEY`)
- Step 2: Sends scraped markdown + name context to Lovable AI with tool calling to extract a structured JSON matching the profile schema
- Step 3: Returns the structured profile data to the frontend
- For partners: extracts company_name, industry, company_size, hq_location, about, website, linkedin_url, contact_person, contact_email, opportunities_offered, connection_to_ussa
- For athletes: extracts first_name, last_name, sport_discipline, bio, career_interests, skills, availability, affiliation, home_mountain, instagram_url, sponsors

**2. Component: `src/components/profile/AIProfilePopulator.tsx`**
- Reusable dialog component used by both AthleteLandingPage and PartnerLandingPage
- Props: `role` ("athlete" | "employer"), `userId`, `onComplete` callback
- Contains:
  - Input form step (name + URL)
  - Animated loading step with progress messages (e.g. "Scanning website...", "Extracting profile info...", "Almost done...")
  - Calls the edge function, then upserts the profile data into the appropriate table
  - Shows success toast and calls onComplete to refresh the dashboard

### Modified Files

**3. `src/components/dashboard/athlete/AthleteLandingPage.tsx`**
- Add "Complete with AI" button with Sparkles icon below the "Complete your profile" link (lines ~209-216), only shown when completeness < 100
- Import and render `AIProfilePopulator` dialog

**4. `src/components/dashboard/employer/PartnerLandingPage.tsx`**
- Same changes as athlete landing page (lines ~215-222)

**5. `supabase/config.toml`**
- Add `[functions.ai-populate-profile]` with `verify_jwt = false`

## Technical Details

### Edge Function Structure
```
supabase/functions/ai-populate-profile/index.ts
```

The function:
1. Validates the JWT using `getClaims()` for authentication
2. Scrapes the provided URL with Firecrawl (`formats: ['markdown', 'links']`)
3. Builds a role-specific system prompt telling the AI what fields to extract
4. Calls Lovable AI gateway with tool calling to get structured JSON output
5. Returns the extracted data

### AI Extraction Strategy
- Uses Lovable AI tool calling (not JSON mode) for reliable structured output
- Defines a `populate_profile` tool with the exact schema matching the database columns
- The system prompt instructs the AI: "If a field cannot be determined from the scraped content, make a reasonable suggestion based on the company/person name and other available context"
- This ensures 100% field coverage even if the website doesn't contain everything

### Profile Update Logic (Frontend)
After receiving AI data, the frontend:
1. Upserts into `employer_profiles` or `athlete_profiles` + `profiles` table
2. Calculates completeness (should be 100% since all fields are filled)
3. Refreshes the dashboard data

### Loading UI
The dialog shows an animated sequence:
- Sparkles animation with rotating status messages
- Messages cycle every 2-3 seconds: "Scanning website...", "Reading company info...", "Extracting profile details...", "Polishing your profile..."
- Uses a Progress bar that advances through stages

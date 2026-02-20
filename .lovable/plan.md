
# Fix AI Location Extraction to Return Clean, Short Values

## Problem

The AI extraction returns verbose, descriptive location strings like *"Mountain West and Northeast (based on Bryan Dunn's location), likely with projects in Big Sky, MT, and Teton Valley, ID"* instead of a clean location name like *"Mountain West and Northeast"*. This affects the location badge display on Partner Directory cards.

## Solution

Update the AI tool schemas in the edge function to add explicit description constraints on location fields, instructing the AI to return only short place names.

### File: `supabase/functions/ai-populate-profile/index.ts`

**Employer tool -- line 20** (`hq_location`):
- Add a description: `"Short location name only, e.g. 'Denver, CO' or 'Mountain West'. No parenthetical notes, explanations, or extra context."`

**Athlete tool -- line 73** (`home_mountain`):
- Add a description: `"Short location or mountain name only, e.g. 'Park City, UT' or 'Vail'. No parenthetical notes, explanations, or extra context."`

This constrains the AI model at the schema level so future extractions produce clean values. Existing long values in the database would need to be manually corrected or re-scraped.

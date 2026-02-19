

# Fix AI Profile Populator Database Errors

## Problem Summary

Three console errors occur when the AI populator tries to save athlete profile data:

1. **GET 406**: `.single()` throws when no athlete profile row exists (returns 0 rows)
2. **POST 400**: The `affiliation` field has a database CHECK constraint limiting values to `'Current Team Member'` or `'Former Team Member'` only. The AI returns free-text like `"U.S. Ski & Snowboard"`, causing the insert to fail.
3. **Console error log**: Same constraint violation surfaced as an uncaught error.

## Changes

### File: `src/components/profile/AIProfilePopulator.tsx`

**Fix 1 -- Line 135**: Replace `.single()` with `.maybeSingle()` so the query returns `null` instead of throwing a 406 when no row exists.

**Fix 2 -- Affiliation mapping**: After building `athleteFields`, validate the `affiliation` value against the allowed values (`'Current Team Member'`, `'Former Team Member'`). If the AI returns something else, default to `'Current Team Member'` (reasonable default for athletes in the U.S. Ski and Snowboard directory).

### File: `supabase/functions/ai-populate-profile/index.ts`

**Fix 3 -- Constrain AI output**: Update the `affiliation` field in the `ATHLETE_TOOL` schema to use an `enum` with the two allowed values, so the AI model is guided to pick a valid option rather than free-texting.

```typescript
// Before
affiliation: { type: "string" },

// After
affiliation: { 
  type: "string", 
  enum: ["Current Team Member", "Former Team Member"],
  description: "Athlete's affiliation with U.S. Ski & Snowboard" 
},
```

## Technical Details

- `AIProfilePopulator.tsx` line 135: `.single()` to `.maybeSingle()`
- `AIProfilePopulator.tsx` around line 146: Add validation to clamp `affiliation` to allowed values
- `ai-populate-profile/index.ts` around line 70: Add `enum` constraint to the tool schema's `affiliation` property
- Redeploy the edge function after the schema change


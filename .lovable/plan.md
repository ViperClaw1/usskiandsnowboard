
# Fix AI Profile Auto-Population Not Saving

## Problems Found

1. **Employer profile never saves** -- The frontend uses `.update()` but no employer_profiles row exists yet for new users. Unlike the athlete flow (which checks for existing and falls back to `.insert()`), the employer flow only does `.update()`, which silently updates zero rows.

2. **Missing image fields in AI extraction** -- The AI tool schemas don't request `logo_url` (employer) or `photo_url` (athlete), so the AI never extracts profile images from the scraped content.

3. **Auth method may fail** -- The edge function uses `supabase.auth.getClaims(token)` which is not a standard method in supabase-js v2. Should use `supabase.auth.getUser()` instead, which validates the token and returns the user.

4. **Employer completeness trigger** -- The database trigger `calculate_employer_profile_completeness` checks `logo_url`, `about`, `website`, `linkedin_url`, `industry`. Without `logo_url`, max completeness is 80%, not 100%.

## Changes

### File 1: `supabase/functions/ai-populate-profile/index.ts`

- Replace `getClaims()` with `getUser()` for reliable auth
- Add `logo_url` to the employer tool schema (to extract company logo from scraped content)
- Add `photo_url` to the athlete tool schema (to extract profile photo from scraped content)

### File 2: `src/components/profile/AIProfilePopulator.tsx`

- For employer flow: check if a row exists first, insert if not, update if yes (same pattern as athlete flow)
- Include `logo_url` in the employer update/insert fields
- Include `photo_url` in the athlete update/insert fields
- Add error logging for the database operations to catch silent failures

### Technical Details

**Edge function auth fix:**
```typescript
// Replace getClaims with getUser
const { data: userData, error: userError } = await supabase.auth.getUser();
if (userError || !userData?.user) {
  return unauthorized response;
}
```

**Employer upsert fix (frontend):**
```typescript
// Check if employer profile exists first
const { data: existing } = await supabase
  .from("employer_profiles")
  .select("id")
  .eq("user_id", userId)
  .single();

const employerFields = {
  company_name: profileData.company_name,
  industry: profileData.industry || null,
  // ... all fields including logo_url
};

if (existing) {
  await supabase.from("employer_profiles").update(employerFields).eq("user_id", userId);
} else {
  await supabase.from("employer_profiles").insert({ user_id: userId, ...employerFields });
}
```

**Tool schema additions:**
- Employer tool: add `logo_url` property with description "URL to the company logo image found on the website"
- Athlete tool: add `photo_url` property with description "URL to the athlete's profile photo"

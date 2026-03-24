
## Expand sport disciplines to grouped multi-select

### What changes

1. **DB migration** — change `athlete_profiles.sport_discipline` from `text` to `text[]` so multiple disciplines can be stored
2. **New constant** — add `SPORT_DISCIPLINES` grouped data to `src/data/suggestions.ts`
3. **MultiSelect enhancement** — support grouped options (category headers) in `src/components/ui/multi-select.tsx`
4. **Onboarding wizard** — replace single `<Select>` on step 7 with `<MultiSelect>` using the grouped disciplines
5. **Profile form** — replace single `<Select>` in `ProfileForm.tsx` with `<MultiSelect>`
6. **Athlete Directory filter** — update sport filter to use the full disciplines list instead of deriving it from athlete data

---

### DB schema change

```sql
ALTER TABLE public.athlete_profiles
  ALTER COLUMN sport_discipline TYPE text[]
  USING CASE
    WHEN sport_discipline IS NULL THEN NULL
    ELSE ARRAY[sport_discipline]
  END;
```

This preserves existing single-value data by wrapping it in an array.

---

### New constant in `src/data/suggestions.ts`

```ts
export const SPORT_DISCIPLINE_GROUPS = [
  { group: "Alpine",    options: [{ label: "Alpine Skiing", value: "Alpine Skiing" }] },
  { group: "Freestyle", options: [
    { label: "Moguls", value: "Moguls" },
    { label: "Aerials", value: "Aerials" },
    { label: "Ski Cross", value: "Ski Cross" },
    { label: "Halfpipe", value: "Halfpipe" },
    { label: "Slopestyle", value: "Slopestyle" },
    { label: "Big Air", value: "Big Air" },
  ]},
  { group: "Nordic", options: [
    { label: "Cross-Country Skiing", value: "Cross-Country Skiing" },
    { label: "Para Cross-Country Skiing", value: "Para Cross-Country Skiing" },
    { label: "Biathlon", value: "Biathlon" },
    { label: "Para Biathlon", value: "Para Biathlon" },
    { label: "Ski Jumping", value: "Ski Jumping" },
    { label: "Nordic Combined", value: "Nordic Combined" },
  ]},
  { group: "Snowboard", options: [
    { label: "Halfpipe", value: "Snowboard Halfpipe" },
    { label: "Slopestyle", value: "Snowboard Slopestyle" },
    { label: "Big Air", value: "Snowboard Big Air" },
    { label: "Snowboard Cross", value: "Snowboard Cross" },
    { label: "Parallel Giant Slalom", value: "Parallel Giant Slalom" },
    { label: "Para Snowboard", value: "Para Snowboard" },
  ]},
];

// Flat list for use where a simple Option[] is needed
export const SPORT_DISCIPLINES_OPTIONS = SPORT_DISCIPLINE_GROUPS.flatMap(g => g.options);
```

Note: Snowboard sub-disciplines get prefixed values (`"Snowboard Halfpipe"`) to avoid collisions with Freestyle's `"Halfpipe"`.

---

### MultiSelect grouped support (`src/components/ui/multi-select.tsx`)

Add an optional `groups` prop alongside the existing `options` prop:

```ts
interface MultiSelectProps {
  options?: Option[];
  groups?: { group: string; options: Option[] }[];
  // ... rest unchanged
}
```

When `groups` is passed, render a `CommandGroup` per category with the group name as heading. The existing `options` path stays unchanged. Search/filter works across all groups.

---

### Files to change (5 + 1 migration)

#### Migration
- `ALTER COLUMN sport_discipline TYPE text[]` with `USING ARRAY[sport_discipline]` cast

#### 1. `src/data/suggestions.ts`
Add `SPORT_DISCIPLINE_GROUPS` and `SPORT_DISCIPLINES_OPTIONS` exports

#### 2. `src/components/ui/multi-select.tsx`
Add optional `groups` prop support — render grouped `CommandGroup` items with headers; search/filter flattens across all groups

#### 3. `src/components/athlete/AthleteOnboardingWizard.tsx`
- Add `sport` field to `FormData` as `string[]` (rename from existing `sport: string`)
- Replace case 7 single `<Select>` with `<MultiSelect groups={SPORT_DISCIPLINE_GROUPS} selected={formValues.sport} onChange={(v) => setValue("sport", v)} />`
- Update `canGoNext` case 7: `formValues.sport.length > 0`
- Update `onSubmit`: `sport_discipline: data.sport` → stays the same field name, now an array

#### 4. `src/components/athlete/ProfileForm.tsx`
- Change `sport_discipline: string` in state to `sport_discipline: string[]`
- Replace `<Select>` block (lines 521–537) with `<MultiSelect groups={SPORT_DISCIPLINE_GROUPS} ...>`
- Update `handleSubmit`: `sport_discipline` passed as array directly (DB now accepts `text[]`)
- Update `loadExistingProfile`: `sport_discipline: athleteData.sport_discipline || []`

#### 5. `src/components/employer/AthleteDirectory.tsx`
- Change the Sport filter `<Select>` to use a fixed list from `SPORT_DISCIPLINES_OPTIONS` instead of deriving dynamically from athlete data
- Keep the same `<Select>` style/component (not MultiSelect) for the filter — just replace the dynamic `Array.from(new Set(...))` with the full flat options list
- Filter logic: since `sport_discipline` is now `string[]`, change `a.sport_discipline === filterSport` to `a.sport_discipline?.includes(filterSport)`

---

### Data flow after migration

```
AthleteOnboardingWizard / ProfileForm
  └─ sport_discipline: string[]  →  athlete_profiles.sport_discipline (text[])
  
AthleteDirectory
  └─ filterSport: string  →  athlete.sport_discipline.includes(filterSport)

Display (badges, profile views)
  └─ sport_discipline.join(", ")  or map to badges
```

### No changes needed to
- `EmployerDirectory.tsx` — displays `sport_discipline` as text; after migration it will be an array so `.join(", ")` should be added wherever it's rendered as a string
- `ConnectionsList.tsx`, `PartnerLandingPage.tsx`, etc. — these display `sport_discipline` directly; need a `.join(", ")` guard added

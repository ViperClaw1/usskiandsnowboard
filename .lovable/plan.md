
## Plan: Typography controls (font family + font size) in layout editors

### What the feature does

Admins get a **Typography** panel in both `AthleteLayoutEditor` and `PartnerLayoutEditor` that lets them pick a font family and a base font size. The setting is stored in the existing `dashboard_layouts.text_overrides` JSONB column under a reserved key (`__typography`), so no DB migration is needed. Both the admin preview and the live athlete/partner dashboards apply the setting via an inline `style` wrapper.

---

### Data shape

Stored in `text_overrides` as a serialised JSON string under the key `__typography`:

```json
{
  "__typography": "{\"fontFamily\":\"Inter\",\"fontSize\":\"16\"}"
}
```

Keeping it inside `text_overrides` means no schema change and no migration — the existing upsert/select logic handles it automatically.

---

### Font options (curated — all available via Google Fonts already loaded or easily added)

| Label | CSS value |
|---|---|
| Montserrat (default) | `Montserrat, sans-serif` |
| Inter | `Inter, sans-serif` |
| Roboto | `Roboto, sans-serif` |
| Open Sans | `Open Sans, sans-serif` |
| Lato | `Lato, sans-serif` |

### Font size options (px)

`12 / 13 / 14 / 15 / 16 (default) / 17 / 18 / 20`

---

### Hook changes — `src/hooks/useDashboardLayout.ts`

1. Add `TypographySettings` interface:
```ts
export interface TypographySettings {
  fontFamily: string;
  fontSize: string; // "16" etc
}
export const DEFAULT_TYPOGRAPHY: TypographySettings = { fontFamily: "Montserrat, sans-serif", fontSize: "16" };
```

2. Extend `DashboardLayout`:
```ts
export interface DashboardLayout {
  text_overrides: Record<string, string>;
  typography: TypographySettings;
}
```

3. On fetch: parse `data.text_overrides.__typography` (JSON.parse, fallback to `DEFAULT_TYPOGRAPHY`).

4. Add `updateTypography(settings: TypographySettings)` mutator — updates `layout.typography` in state.

5. In `saveLayout`: before saving, inject `{ ...layout.text_overrides, __typography: JSON.stringify(layout.typography) }` as the JSONB value.

6. In `resetLayout`: reset typography back to `DEFAULT_TYPOGRAPHY`.

7. In `useDashboardTextOverrides` (read-only hook): also parse `__typography` and expose a `typography` value so live dashboards can consume it.

---

### New shared UI component — `src/components/dashboard/admin/TypographyControls.tsx`

A compact two-control row placed inside the toolbar area:
- **Font Family** — `<Select>` with the 5 options
- **Font Size** — `<Select>` with 8 size options
- Takes `typography`, `onUpdate`, `disabled` as props

---

### Editor changes — `AthleteLayoutEditor` & `PartnerLayoutEditor`

1. Import `TypographyControls` and `updateTypography` from the hook.
2. Add `TypographyControls` to the toolbar row (between the hint text and the Save/Reset buttons).
3. Wrap the entire preview section in:
```tsx
<div style={{ fontFamily: layout.typography.fontFamily, fontSize: `${layout.typography.fontSize}px` }}>
  {/* existing hero + cards */}
</div>
```

This makes the editor preview reflect the chosen typography immediately.

---

### Live dashboard changes — `AthleteLandingPage` & `PartnerLandingPage`

Both already call `useDashboardTextOverrides(role)`. The hook will now also return `typography`.

Wrap the root `<div>` with:
```tsx
<div style={{ fontFamily: typography.fontFamily, fontSize: `${typography.fontSize}px` }}>
```

No other changes to the live pages.

---

### Google Fonts loading

The four new fonts (Inter, Roboto, Open Sans, Lato) need to be added to the existing `@import` in `src/index.css`. Currently Montserrat is imported. We extend it to a single `@import` with all five families.

---

### Files to change

| File | Change |
|---|---|
| `src/hooks/useDashboardLayout.ts` | Add `TypographySettings`, extend `DashboardLayout`, parse/persist `__typography`, add `updateTypography`, expose `typography` in read-only hook |
| `src/components/dashboard/admin/TypographyControls.tsx` | **New file** — font family + font size selectors |
| `src/components/dashboard/admin/AthleteLayoutEditor.tsx` | Add `TypographyControls` to toolbar, wrap preview in typography `style` |
| `src/components/dashboard/admin/PartnerLayoutEditor.tsx` | Same as above |
| `src/components/dashboard/athlete/AthleteLandingPage.tsx` | Consume `typography` from hook, apply wrapper style |
| `src/components/dashboard/employer/PartnerLandingPage.tsx` | Same as above |
| `src/index.css` | Extend Google Fonts `@import` to include Inter, Roboto, Open Sans, Lato |

No DB migration needed. No new dependencies.

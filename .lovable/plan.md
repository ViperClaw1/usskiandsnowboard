
## Root cause analysis

### Issue 1 — Empty white avatar circle in dialogs
In `EmployerDirectory.tsx` dialog (line 650–666), the Avatar is coded as:
```jsx
<Avatar ...>
  {selectedEmployer.logo_url ? (
    <AvatarImage src={...} />
  ) : (
    <AvatarFallback ...>initials</AvatarFallback>
  )}
</Avatar>
```
This is wrong. Radix UI's `AvatarFallback` only renders when an `AvatarImage` is present **and fails to load** OR when there is no `AvatarImage` child at all. However, conditionally rendering either `AvatarImage` OR `AvatarFallback` (mutually exclusive) means when `logo_url` exists, there's no fallback — that's fine. But when `logo_url` is null, only `AvatarFallback` is rendered — this should actually work... 

The real bug: the Avatar root has `bg-background` class applied, which makes the circle appear white. When `AvatarFallback` has `bg-primary/10`, it should override — but if the fallback doesn't render (because the conditional is wrong), white shows. **The correct pattern** is to always render both `<AvatarImage>` and `<AvatarFallback>` as siblings inside `<Avatar>`, letting Radix handle the switching:
```jsx
<Avatar ...>
  <AvatarImage src={logo_url ?? undefined} ... />
  <AvatarFallback className="bg-primary/10 text-primary ...">initials</AvatarFallback>
</Avatar>
```
This is already applied correctly on the **cards** (lines 545–558) but NOT in the **detail dialogs**.

### Issue 2 — Empty grey banner instead of image uploader placeholder
The dialogs in both files render a bare gradient div with no upload interaction when `background_image_url` is null. Since these are **other users' profiles** (read-only in the directory), there should be no actual upload. But the user wants the same visual treatment as in `/dashboard` — a gradient placeholder with the `ImagePlus` icon and "Add background photo" text. Since this is a read-only view of someone else's profile, the button will be non-functional (or hidden) — but the same styled gradient placeholder with the icon should appear.

Actually, the user screenshots show their OWN profile being viewed via the directory (Cardinal Lands is presumably the logged-in employer's own company). However, the directory shows ALL profiles. The cleanest approach: show the same styled gradient with the `ImagePlus` icon on ALL profiles in the dialog (visual consistency) but only make it clickable for the profile owner. This is exactly what `AthleteProfilePreview` / `EmployerProfilePreview` components already do with the `isOwner` flag pattern.

But since these dialogs don't have upload wiring, the simplest correct fix is: **just show the gradient placeholder consistently** (it already does this), and the "empty grey rectangle" the user is seeing might actually be the `bg-gradient-to-br from-primary/20` which looks grey in light mode. The user sees it as "empty grey" and wants it to visually show the ImagePlus icon + text (like the dashboard does). No actual upload needed in the read-only directory dialog.

### Files to change: 2

#### 1. `src/components/athlete/EmployerDirectory.tsx`
**Dialog banner (lines 646–668):**
- Change the empty gradient div to include the `ImagePlus` icon + "No background photo" text, consistent with the dashboard style
- Fix the avatar — replace the conditional `{logo_url ? <AvatarImage/> : <AvatarFallback/>}` with the correct Radix pattern: always render `<AvatarImage src={logo_url ?? undefined}>` + `<AvatarFallback>initials</AvatarFallback>` as siblings

**Card avatars (lines 545–558):** Already correct — `AvatarImage` + `AvatarFallback` as siblings. No change needed.

#### 2. `src/components/employer/AthleteDirectory.tsx`
**Dialog banner (lines 734–753):**
- Same gradient placeholder fix — add `ImagePlus` icon + text when no background image
- Fix athlete avatar in dialog — already uses `<AvatarImage src={...}> + <AvatarFallback>` sibling pattern (lines 741–751), this looks correct already. Verify.

**Card avatars (lines 610–626):** Already correct. No change needed.

### Exact changes

**EmployerDirectory.tsx dialog avatar** — replace the conditional pattern:
```jsx
// BEFORE (broken)
<Avatar ...>
  {selectedEmployer.logo_url ? (
    <AvatarImage src={selectedEmployer.logo_url} ... />
  ) : (
    <AvatarFallback ...>initials</AvatarFallback>
  )}
</Avatar>

// AFTER (correct Radix pattern)
<Avatar ...>
  <AvatarImage src={selectedEmployer.logo_url ?? undefined} ... />
  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
    {initials}
  </AvatarFallback>
</Avatar>
```

**Both dialog banners** — replace empty gradient div with styled placeholder:
```jsx
// BEFORE
<div className={`h-28 rounded-t-lg overflow-hidden ${bg ? "bg-cover bg-center" : "bg-gradient-to-br from-primary/20..."}`}
  style={bg ? { backgroundImage: ... } : undefined}
/>

// AFTER
{bg ? (
  <div className="h-28 rounded-t-lg overflow-hidden bg-cover bg-center"
    style={{ backgroundImage: `url(${bg})` }} />
) : (
  <div className="h-28 rounded-t-lg bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <ImagePlus className="h-8 w-8" />
      <span className="text-sm font-medium">No background photo</span>
    </div>
  </div>
)}
```

`ImagePlus` is already imported in both files' sibling components. Need to add it to imports in `EmployerDirectory.tsx` (currently imports `Building2, Loader2, FilterX, Link, Search, X, RefreshCw`) and `AthleteDirectory.tsx` (currently imports `Loader2, Instagram, ChevronLeft, ChevronRight, Search, X, Share2, RefreshCw`).

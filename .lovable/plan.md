
## Root Cause

`LogoHeader` is defined as a function component **inside** the `Auth` component body (line 295):

```tsx
const LogoHeader = ({ title, description }: ...) => (...)
```

Every time any state changes (email input, password, touched flags, etc.), React re-renders `Auth`, which **redefines** `LogoHeader` as a brand-new component reference. React sees it as a different component type on each render and **unmounts + remounts** the old one — causing the logo `<img>` to flash/blink as the browser re-fetches/re-paints the image element from scratch.

The same applies to `BackButton` defined at line 310.

## Fix

**Move `LogoHeader` and `BackButton` out of the `Auth` component** to module-level, so their component identity is stable across renders. They only receive `title`/`description` as props and don't need closure access to `Auth`'s state — so this is safe.

```tsx
// ── Module-level (outside Auth) ──────────────────────────
const LogoHeader = ({ title, description }: { title: string; description: string }) => (
  <CardHeader ...>
    ...logo img tags...
  </CardHeader>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}>← Back</button>
);
```

`BackButton` currently captures `setStep` via closure. It needs to accept an `onClick` prop instead, and each call site passes `() => setStep("landing")` etc. — the lambda is created at the call site, not at definition time, so the component identity stays stable.

### Also: preload the logo images in `index.html`

To make the logo render instantly on first mount (instead of appearing after main content), add `<link rel="preload">` hints for both logo assets in `public/index.html` → `index.html`. This tells the browser to fetch these images at the highest priority during the initial HTML parse, before React even boots.

```html
<link rel="preload" as="image" href="/assets/us-ski-snowboard-logo.png" />
<link rel="preload" as="image" href="/assets/us-ski-mobile-logo.png" />
```

Since these are Vite-processed assets with content hashes, we need to use the `fetchpriority="high"` attribute directly on the `<img>` tags instead (Vite hashes change on every build, making static preload hrefs stale).

```tsx
<img src={usSkiLogo} fetchPriority="high" ... />
<img src={usSkiMobileLogo} fetchPriority="high" ... />
```

### Files to change
1. **`src/pages/Auth.tsx`** — hoist `LogoHeader` and `BackButton` to module scope; add `fetchPriority="high"` to logo `<img>` tags; update `BackButton` to accept `onClick` prop

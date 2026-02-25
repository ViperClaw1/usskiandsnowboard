

# Fix: Email Template Image URLs in Edge Functions

## Root Cause

All three edge functions (`invite-user`, `resend-confirmation`, `send-confirmation-email`) have the same two bugs preventing images from rendering:

### Bug 1: Invalid Vite/React imports in Deno edge functions

```typescript
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import usLogo from "@/assets/us-logo-new.png";
```

The `@/` path alias is a **Vite bundler feature** that only works in the frontend build pipeline. Edge functions run in **Deno**, which has no knowledge of Vite aliases or asset bundling. These imports silently resolve to `undefined`, so every reference to `mountainHeaderBg` or `usLogo` in the HTML produces broken URLs.

### Bug 2: Nested backticks and JSX syntax in HTML strings

In `send-confirmation-email` and `resend-confirmation`, the logo image uses JSX-style attribute syntax inside an HTML template literal:

```html
<img src={usLogo} ... />          <!-- JSX syntax, not valid in a string -->
```

And the background image uses nested backticks which break the outer template literal:

```
background-image: `url(${mountainHeaderBg})`;
```

The `invite-user` function correctly uses `src="${usLogo}"` but still has the nested backtick issue on `background-image`.

## Fix

### 1. Host images publicly

Copy `src/assets/mountain-header-bg.png` and `src/assets/us-logo-new.png` into the `public/` directory (e.g., `public/email/mountain-header-bg.png` and `public/email/us-logo-new.png`). Files in `public/` are served as-is at the published URL without Vite hashing.

### 2. Replace imports with absolute URLs in all three edge functions

Remove the two `import` lines and replace all image references with full URLs pointing to the published app:

```typescript
const MOUNTAIN_BG_URL = "https://usskiandsnowboard.lovable.app/email/mountain-header-bg.png";
const US_LOGO_URL = "https://usskiandsnowboard.lovable.app/email/us-logo-new.png";
```

### 3. Fix the HTML template syntax

Replace the broken backtick/JSX patterns with proper template literal interpolation:

**Background image** (all three files):
```
background-image: url('${MOUNTAIN_BG_URL}');
```

**Logo src** (send-confirmation-email and resend-confirmation):
```html
<img src="${US_LOGO_URL}" ... />
```

### Files changed

```
New files (asset copies):
  public/email/mountain-header-bg.png   (copy from src/assets/)
  public/email/us-logo-new.png          (copy from src/assets/)

Modified files:
  supabase/functions/invite-user/index.ts
  supabase/functions/resend-confirmation/index.ts
  supabase/functions/send-confirmation-email/index.ts
```

Each edge function file gets three small edits: remove the two `import` lines, add two URL constants, and fix the `background-image` / `src` references in the HTML string.


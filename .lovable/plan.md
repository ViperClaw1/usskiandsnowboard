

# Training Tab -- Article Publishing Platform

## Overview

Add a "Training" content channel to the platform where admins can publish articles for athletes. This includes a new database table, a storage bucket for images, an article feed page for athletes, individual article detail pages, an admin article management section, and navigation updates.

## Database Changes

### New table: `training_articles`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK, default gen_random_uuid()) | |
| title | text, NOT NULL | |
| slug | text, NOT NULL, UNIQUE | Auto-generated from title |
| subtitle | text | Italic subheading |
| body | text, NOT NULL | Rich text / HTML content |
| category | text | e.g. "Career Development", "Financial Literacy", "Mental Performance", "Life After Sport" |
| hero_image_url | text | URL from storage bucket |
| author_name | text | Free-text author name |
| author_image_url | text | Headshot or logo URL |
| status | text, default 'draft' | 'draft' or 'published' |
| reading_time_minutes | integer | Estimated read time |
| published_at | timestamptz | When the article was published |
| created_at | timestamptz, default now() | |
| updated_at | timestamptz, default now() | |
| created_by | uuid, NOT NULL | References auth.users(id) via user_id pattern |

### RLS Policies

- **SELECT**: Authenticated users can read articles where `status = 'published'`. Admins can read all articles.
- **INSERT / UPDATE / DELETE**: Only users with admin role (via `has_role` function check).

### Storage bucket: `training-images`

- Public bucket for hero images and author headshots
- INSERT/UPDATE/DELETE policies restricted to authenticated users with the admin role

### Trigger

- Auto-update `updated_at` on row update (reuse existing trigger pattern)

## New Files

### 1. `src/pages/Training.tsx` -- Article Feed Page

The main Training page visible to authenticated athletes. Styled to match the reference screenshots:

- **Hero section**: Dark navy gradient background with a "TRAINING & DEVELOPMENT" badge, large serif-style heading "Resources to Help You Thrive Beyond the Mountain", and subtitle text. Curved bottom edge using an SVG or CSS clip-path.
- **Category filter bar**: Horizontal row of text buttons -- "All Topics", "Career Development", "Mental Performance", "Financial Literacy", "Life After Sport". Active category has a red underline. No inner tabs component.
- **Article cards grid**: Two-column responsive grid. Each card shows:
  - Hero image with colored gradient overlay
  - Category badge (colored pill)
  - Title (bold, serif-inspired)
  - Excerpt (2-3 lines, truncated)
  - Author name + date on bottom row
  - Reading time badge
- **Empty state** when no published articles exist

Data is fetched from `training_articles` where `status = 'published'`, ordered by `published_at desc`.

### 2. `src/pages/TrainingArticle.tsx` -- Article Detail Page

Route: `/training/:slug`

- "Back to Training" link at the top
- Hero image (full-width, if provided)
- Category badge + reading time + publish date row
- Title (H1)
- Subtitle (italic)
- Author attribution block: avatar/logo image + author name text
- Article body rendered as HTML (using `dangerouslySetInnerHTML` with the stored rich text)
- Clean, readable typography with proper spacing

### 3. `src/components/dashboard/admin/TrainingArticleManager.tsx` -- Admin CRUD

A section added as a new tab in the Admin Dashboard. Contains:

- **Article list table**: Shows title, category, status (draft/published), published date, and action buttons (Edit, Unpublish/Publish, Delete)
- **Create/Edit dialog**: Form with fields for:
  - Title (text input)
  - Subtitle (text input)
  - Category (select dropdown with predefined categories)
  - Body (textarea for rich text / HTML content)
  - Author name (free-text input)
  - Author image (file upload -- headshot or logo; shows fallback description)
  - Hero image (file upload)
  - Status toggle (Draft / Published)
  - Reading time (number input, optional -- can auto-calculate from body word count)
- Slug is auto-generated from the title on create, editable on edit
- Publishing sets `published_at` to current timestamp; unpublishing sets status back to 'draft'

### 4. Updates to Existing Files

**`src/App.tsx`**: Add two new routes:
- `/training` -> `Training` page
- `/training/:slug` -> `TrainingArticle` page

**`src/components/AuthenticatedNav.tsx`**: Add a "Training" link between "News" and "Dashboard" in the desktop nav. Style it similarly to the reference screenshot (could use a slightly highlighted button style or a simple text link).

**`src/components/MobileNav.tsx`**: Add "Training" to the `navItems` array.

**`src/components/dashboard/AdminDashboard.tsx`**: Add a fourth tab "Training" to the admin tabs, rendering `TrainingArticleManager`.

## Design Notes

- The hero section uses the existing navy color scheme (`--primary: 215 65% 25%`) with a gradient
- Category badges use color-coded pills (red for Career Development, green for Financial Literacy, blue for Mental Performance, etc.)
- Article cards have rounded corners, subtle shadows matching `shadow-elegant`, and hover effects
- The curved transition between hero and content area is achieved with a CSS clip-path or inline SVG
- Typography uses the existing Montserrat font family with heavier weights for headings
- The article body on the detail page uses clean prose styling with proper heading hierarchy (H2 for section headings), bullet lists, and paragraph spacing

## Technical Details

### Slug Generation

```typescript
const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
```

### Category Constants

```typescript
const TRAINING_CATEGORIES = [
  "Career Development",
  "Mental Performance",
  "Financial Literacy",
  "Life After Sport",
  "Leadership",
  "Networking",
];
```

### Image Upload Pattern

Reuse the existing upload pattern from `CompanyProfileForm` -- upload to the `training-images` bucket under `articles/{articleId}/hero.ext` or `authors/{filename}`.

### Article Body

The body field stores HTML content. On the detail page it is rendered with `dangerouslySetInnerHTML`. The admin form uses a `<Textarea>` for now (HTML input). This can be upgraded to a WYSIWYG editor later.

### Reading Time Calculation

```typescript
const estimateReadingTime = (text: string) =>
  Math.max(1, Math.ceil(text.replace(/<[^>]*>/g, '').split(/\s+/).length / 200));
```

### File Structure Summary

```text
New files:
  src/pages/Training.tsx
  src/pages/TrainingArticle.tsx
  src/components/dashboard/admin/TrainingArticleManager.tsx

Modified files:
  src/App.tsx                    (add routes)
  src/components/AuthenticatedNav.tsx  (add Training link)
  src/components/MobileNav.tsx         (add Training nav item)
  src/components/dashboard/AdminDashboard.tsx  (add Training tab)

Database migration:
  training_articles table + RLS policies + storage bucket
```


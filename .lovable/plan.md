

## Create Expert Profile Dialog — UI Improvements

### Changes to `src/components/experts/ExpertProfileForm.tsx`

**1. Separate Auto-fill and manual sections with a visual divider**
- Add a horizontal `<Separator />` between the Auto-fill section and the manual fields section.

**2. Move Full Name into the Auto-fill section**
- Move the Full Name input (required, with `*`) into the Auto-fill background-colored section, placed above the LinkedIn URL input.
- The Auto-fill button is disabled until both `full_name` and `linkedin_url` are non-empty.
- Remove the duplicate Full Name field from the manual fields grid below.

**3. Replace Photo URL text input with an image uploader**
- Replace the plain `<Input>` for photo_url with a file input that:
  - Shows a clickable upload area (small, inline — avatar-sized thumbnail + upload icon)
  - Uploads the selected image to Supabase storage bucket `expert-photos` under `{userId}/profile/` path
  - Sets `photo_url` to the resulting public URL
  - Shows a preview thumbnail when a photo is set, with a remove button
- Requires passing a `userId` prop (already available via `adminUserId` or from the expert profile's `user_id`). Will add a `userId` prop to the form.

**4. Replace emoji icon on "US Ski & Snowboard Alum" checkbox with app logo**
- Replace `🏔️` with `<img src={usLogo} className="h-4 w-4 object-contain" />` using the existing `src/assets/us-logo-new.png` asset.

### Storage bucket
- Need to ensure an `expert-photos` storage bucket exists. Will create via migration if needed, or reuse existing `athlete-photos` bucket pattern.

### Files Modified
- `src/components/experts/ExpertProfileForm.tsx` — all four changes above
- `src/components/dashboard/ExpertDashboard.tsx` — pass `userId` prop to `ExpertProfileForm`


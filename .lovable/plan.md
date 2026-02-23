

# Fix: Storage RLS Policy Violation on Logo Upload

## Problem

The `EmployerOnboardingWizard` uploads company logos to a flat path like `userid-timestamp.jpg` instead of `userid/logo-timestamp.jpg`. The storage RLS policy requires the first folder in the path to match the authenticated user's ID. Without that folder structure, the upload is rejected with "new row violates row-level security policy."

The `CompanyProfileForm` already uses the correct path format (`${userId}/logo-${timestamp}.${fileExt}`), so this only affects the onboarding wizard.

This also explains why AI-populated profile images fail -- the AI populator sets a `logo_url` from an external source, but if the onboarding wizard was used first, the path mismatch causes issues.

## Fix

**File: `src/components/employer/EmployerOnboardingWizard.tsx` (~line 137)**

Change the file path from:
```
const filePath = `${fileName}`;
```
to:
```
const filePath = `${user.id}/${fileName}`;
```

This ensures the uploaded file lands under the user's ID folder, satisfying the RLS policy that checks `(storage.foldername(name))[1] = auth.uid()::text`.

## Technical Details

- The storage bucket `company-logos` has an INSERT policy: `bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text`
- `storage.foldername(name)` extracts folder segments from the object path
- Without the user ID as the first folder, the policy rejects the upload
- Only one line needs to change; no database or RLS policy modifications required


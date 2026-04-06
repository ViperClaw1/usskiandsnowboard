-- Allow authenticated users to create their own `public.profiles` row.
-- This is required for client-side flows (e.g. AI autofill) that may need to
-- insert the parent `profiles` record before inserting into role-specific tables
-- (like `employer_profiles`) which FK to `profiles(id)`.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


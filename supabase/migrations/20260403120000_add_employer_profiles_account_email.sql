-- Account email for the partner user (mirrors auth.users / profiles.email).
-- Required for PostgREST + AI upsert; employer_profiles previously only had contact_email.
ALTER TABLE public.employer_profiles
ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.employer_profiles.email IS 'Logged-in user account email; distinct from contact_email (company contact).';

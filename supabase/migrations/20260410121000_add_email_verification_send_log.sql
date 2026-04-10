CREATE TABLE IF NOT EXISTS public.email_verification_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL CHECK (source IN ('signup', 'resend')),
  requester_ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_send_log_email_source_created
  ON public.email_verification_send_log (email, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verification_send_log_ip_created
  ON public.email_verification_send_log (requester_ip, created_at DESC);

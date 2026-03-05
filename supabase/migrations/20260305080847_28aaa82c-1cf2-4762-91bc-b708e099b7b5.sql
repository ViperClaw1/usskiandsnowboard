
-- Create the before_user_created auth hook function
-- This must accept a jsonb event and return jsonb
-- Returning an "error" key blocks the signup at the DB level
CREATE OR REPLACE FUNCTION public.block_oauth_signup_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider text;
BEGIN
  -- Extract the provider from the event payload
  provider := event->'user'->'app_metadata'->>'provider';

  -- Block all non-email providers (Google, Apple, etc.)
  IF provider IS NOT NULL AND provider != 'email' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 422,
        'message', 'Sign-up via Google or Apple is not available. Please use an invite code or apply via the waitlist.'
      )
    );
  END IF;

  -- Allow email signups through
  RETURN '{}';
END;
$$;

-- Grant execution rights to the supabase_auth_admin role so the hook can invoke it
GRANT EXECUTE ON FUNCTION public.block_oauth_signup_hook(jsonb) TO supabase_auth_admin;

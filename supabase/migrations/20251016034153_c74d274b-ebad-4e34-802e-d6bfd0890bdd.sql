-- Create a function to clear connection requests (for testing purposes)
CREATE OR REPLACE FUNCTION public.clear_connection_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.connection_requests;
END;
$$;

-- Execute the function to clear all connection requests
SELECT public.clear_connection_requests();
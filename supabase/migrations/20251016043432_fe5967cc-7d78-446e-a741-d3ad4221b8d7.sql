-- Create athlete update policy if missing (using EXECUTE with single quotes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'connection_requests' 
      AND policyname = 'Athletes can update their received requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Athletes can update their received requests" '
      'ON public.connection_requests '
      'FOR UPDATE '
      'USING ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.athlete_profiles ap '
      '    WHERE ap.id = connection_requests.athlete_id '
      '      AND ap.user_id = auth.uid() '
      '  ) '
      ') '
      'WITH CHECK ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.athlete_profiles ap '
      '    WHERE ap.id = connection_requests.athlete_id '
      '      AND ap.user_id = auth.uid() '
      '  ) '
      ');';
  END IF;
END $$;

-- Add table to realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'connection_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests';
  END IF;
END $$;

-- Ensure full row data for updates in realtime (idempotent)
ALTER TABLE public.connection_requests REPLICA IDENTITY FULL;

-- Keep updated_at fresh on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_connection_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_connection_requests_updated_at
    BEFORE UPDATE ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
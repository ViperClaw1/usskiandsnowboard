-- Allow athletes to delete connection requests they are part of
CREATE POLICY "Athletes can delete their connection requests"
ON public.connection_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM athlete_profiles ap
    WHERE ap.id = connection_requests.athlete_id
      AND ap.user_id = auth.uid()
  )
);

-- Allow employers to delete connection requests they are part of
CREATE POLICY "Employers can delete their connection requests"
ON public.connection_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employer_profiles ep
    WHERE ep.id = connection_requests.employer_id
      AND ep.user_id = auth.uid()
  )
);
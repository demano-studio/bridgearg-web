-- Allow authenticated admin UI to list newsletter subscribers (read-only).
-- Writes remain service_role via upsert_subscriber / edge functions.

DROP POLICY IF EXISTS "Authenticated can read newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated can read newsletter_subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (true);

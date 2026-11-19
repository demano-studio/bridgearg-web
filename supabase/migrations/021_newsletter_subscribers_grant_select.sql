-- Admin UI lists newsletter_subscribers via PostgREST as authenticated.
-- Policy already exists; GRANT was missing (permission denied before RLS).

GRANT SELECT ON public.newsletter_subscribers TO authenticated;

-- Contact form inbox for admin (Fase 5).
-- Written by contact-request (service_role); read by authenticated admin; status updates via admin-write.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'responded')),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON public.contact_messages (status);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read contact_messages" ON public.contact_messages;
CREATE POLICY "Authenticated can read contact_messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages contact_messages" ON public.contact_messages;
CREATE POLICY "Service role manages contact_messages"
  ON public.contact_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.contact_messages IS
  'Inbox from /contact form. status: new → read → responded.';

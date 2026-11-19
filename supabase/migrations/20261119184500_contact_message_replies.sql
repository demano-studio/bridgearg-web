-- Chat inbox: outbound replies + email index for virtual threads (lower(email)).

CREATE TABLE IF NOT EXISTS public.contact_message_replies (
  id BIGSERIAL PRIMARY KEY,
  thread_email TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by_email TEXT,
  resend_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_message_replies_thread_email_lower
  ON public.contact_message_replies (lower(thread_email));

CREATE INDEX IF NOT EXISTS idx_contact_message_replies_created_at
  ON public.contact_message_replies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email_lower
  ON public.contact_messages (lower(email));

COMMENT ON TABLE public.contact_message_replies IS
  'Outbound admin replies for contact inbox threads (virtual thread = lower(email)).';

ALTER TABLE public.contact_message_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read contact_message_replies with mensajes view"
  ON public.contact_message_replies;
CREATE POLICY "Admin can read contact_message_replies with mensajes view"
  ON public.contact_message_replies FOR SELECT TO authenticated
  USING (public.admin_can('mensajes', 'view'));

DROP POLICY IF EXISTS "Service role manages contact_message_replies"
  ON public.contact_message_replies;
CREATE POLICY "Service role manages contact_message_replies"
  ON public.contact_message_replies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.contact_message_replies TO authenticated;
GRANT ALL ON public.contact_message_replies TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.contact_message_replies_id_seq TO service_role;

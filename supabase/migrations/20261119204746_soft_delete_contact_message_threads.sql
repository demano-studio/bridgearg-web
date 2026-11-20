-- Soft-delete (Papelera) for contact message threads.

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.contact_message_replies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.contact_messages.deleted_at IS 'Soft-delete timestamp; null = active in Mensajes.';
COMMENT ON COLUMN public.contact_message_replies.deleted_at IS 'Soft-delete timestamp; null = active in Mensajes.';

CREATE INDEX IF NOT EXISTS idx_contact_messages_active
  ON public.contact_messages (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_deleted_at
  ON public.contact_messages (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_message_replies_active
  ON public.contact_message_replies (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_message_replies_deleted_at
  ON public.contact_message_replies (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- RLS: active inbox via mensajes view; trash via papelera view.
DROP POLICY IF EXISTS "Admin can read contact_messages with mensajes view"
  ON public.contact_messages;
CREATE POLICY "Admin can read contact_messages by section"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (
    public.is_admin_owner()
    OR (
      deleted_at IS NULL
      AND public.admin_can('mensajes', 'view')
    )
    OR (
      deleted_at IS NOT NULL
      AND public.admin_can('papelera', 'view')
    )
  );

DROP POLICY IF EXISTS "Admin can read contact_message_replies with mensajes view"
  ON public.contact_message_replies;
CREATE POLICY "Admin can read contact_message_replies by section"
  ON public.contact_message_replies FOR SELECT TO authenticated
  USING (
    public.is_admin_owner()
    OR (
      deleted_at IS NULL
      AND public.admin_can('mensajes', 'view')
    )
    OR (
      deleted_at IS NOT NULL
      AND public.admin_can('papelera', 'view')
    )
  );

-- Extend daily purge job to hard-delete soft-deleted message threads (>30d).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-soft-deleted-artworks-lotes') THEN
      PERFORM cron.unschedule('purge-soft-deleted-artworks-lotes');
    END IF;

    PERFORM cron.schedule(
      'purge-soft-deleted-artworks-lotes',
      '15 4 * * *',
      $cron$
        DELETE FROM public.artworks
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
        DELETE FROM public.lotes
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
        DELETE FROM public.contact_message_replies
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
        DELETE FROM public.contact_messages
        WHERE deleted_at IS NOT NULL
          AND deleted_at < now() - interval '30 days';
      $cron$
    );
  END IF;
END $$;

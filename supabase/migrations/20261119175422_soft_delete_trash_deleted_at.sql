-- Soft-delete (Papelera) for artworks + lotes.

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.artworks.deleted_at IS 'Soft-delete timestamp; null = active.';
COMMENT ON COLUMN public.lotes.deleted_at IS 'Soft-delete timestamp; null = active.';

CREATE INDEX IF NOT EXISTS idx_artworks_active
  ON public.artworks (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_artworks_deleted_at
  ON public.artworks (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_active
  ON public.lotes (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_deleted_at
  ON public.lotes (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- RLS: anon only sees active rows; authenticated (admin) sees all (incl. trash).
DROP POLICY IF EXISTS "Artworks are readable by everyone" ON public.artworks;
DROP POLICY IF EXISTS "Anon can read non-deleted artworks" ON public.artworks;
DROP POLICY IF EXISTS "Authenticated can read all artworks" ON public.artworks;

CREATE POLICY "Anon can read non-deleted artworks"
  ON public.artworks
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can read all artworks"
  ON public.artworks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read lotes" ON public.lotes;
DROP POLICY IF EXISTS "Anon can read non-deleted lotes" ON public.lotes;
DROP POLICY IF EXISTS "Authenticated can read all lotes" ON public.lotes;

CREATE POLICY "Anon can read non-deleted lotes"
  ON public.lotes
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can read all lotes"
  ON public.lotes
  FOR SELECT
  TO authenticated
  USING (true);

-- Daily purge of trash older than 30 days (requires pg_cron).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-soft-deleted-artworks-lotes')
  THEN
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
      $cron$
    );
  END IF;
END $$;

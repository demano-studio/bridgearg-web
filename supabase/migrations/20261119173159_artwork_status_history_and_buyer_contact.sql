-- Status change audit trail + buyer contact for manual gallery sales.

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS comprador_contacto text;

COMMENT ON COLUMN public.artworks.comprador_contacto IS
  'Teléfono o email libre del comprador (venta manual desde admin).';

CREATE TABLE IF NOT EXISTS public.artwork_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  artwork_id bigint NOT NULL REFERENCES public.artworks (id) ON DELETE CASCADE,
  from_status public.artwork_status_enum,
  to_status public.artwork_status_enum NOT NULL,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artwork_status_history_artwork_id_changed_at
  ON public.artwork_status_history (artwork_id, changed_at DESC);

ALTER TABLE public.artwork_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read artwork_status_history"
  ON public.artwork_status_history;
CREATE POLICY "Authenticated can read artwork_status_history"
  ON public.artwork_status_history
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.artwork_status_history FROM PUBLIC;
REVOKE ALL ON public.artwork_status_history FROM anon;
GRANT SELECT ON public.artwork_status_history TO authenticated;
GRANT ALL ON public.artwork_status_history TO service_role;

COMMENT ON TABLE public.artwork_status_history IS
  'Historial de cambios de status de obras (escrito vía admin-write / service_role).';

-- Table 'purchases': historical record of completed sales.
-- Independent source of truth from Stripe; linked to artworks and purchase_verifications.
-- Run in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.purchases (
  id BIGSERIAL PRIMARY KEY,
  artwork_id BIGINT NOT NULL REFERENCES public.artworks(id),
  purchase_verification_id UUID REFERENCES public.purchase_verifications(id),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  shipping_address TEXT,
  amount_usd NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_artwork_id ON public.purchases (artwork_id);

-- RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin autenticado puede leer purchases"
  ON public.purchases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo service_role puede escribir purchases"
  ON public.purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.purchases IS 'Registro histórico de ventas completadas; fuente de verdad propia, independiente de Stripe.';

-- 018: Trade Program admin fields (promo codes, notes, source, deactivate).
-- RLS sigue sin policies; solo service_role.

ALTER TABLE public.trade_applications
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS stripe_promotion_code_id text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'form',
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trade_applications_source_check'
      AND conrelid = 'public.trade_applications'::regclass
  ) THEN
    ALTER TABLE public.trade_applications
      ADD CONSTRAINT trade_applications_source_check
      CHECK (source IN ('form', 'manual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trade_applications_promo_code
  ON public.trade_applications (promo_code)
  WHERE promo_code IS NOT NULL;

COMMENT ON COLUMN public.trade_applications.promo_code IS 'Código de promoción Stripe visible para el cliente Trade.';
COMMENT ON COLUMN public.trade_applications.stripe_promotion_code_id IS 'ID de Stripe promotion_code (promo_...).';
COMMENT ON COLUMN public.trade_applications.source IS 'Origen: form (web) o manual (admin).';
COMMENT ON COLUMN public.trade_applications.deactivated_at IS 'Cuando el promo code se desactivó en Stripe.';

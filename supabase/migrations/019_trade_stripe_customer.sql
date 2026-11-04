-- 019: Bind Trade promo codes to a Stripe Customer.
-- RLS sigue sin policies; solo service_role (sin cambios de grants).

ALTER TABLE public.trade_applications
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_trade_applications_stripe_customer
  ON public.trade_applications (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_applications_email_lower_approved
  ON public.trade_applications (lower(email))
  WHERE status = 'approved' AND deactivated_at IS NULL;

COMMENT ON COLUMN public.trade_applications.stripe_customer_id IS
  'Stripe Customer (cus_...) al que está restringido el promotion code Trade.';

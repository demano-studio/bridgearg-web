-- Pedidos: fulfillment lifecycle on purchases (Fase 4).
-- Flow: paid → preparing → shipped → delivered

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS shipping_status TEXT NOT NULL DEFAULT 'paid';

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_shipping_status_check;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_shipping_status_check
  CHECK (shipping_status IN ('paid', 'preparing', 'shipped', 'delivered'));

CREATE INDEX IF NOT EXISTS idx_purchases_shipping_status
  ON public.purchases (shipping_status);

COMMENT ON COLUMN public.purchases.shipping_status IS
  'Fulfillment: paid → preparing → shipped → delivered. Set to paid when Stripe records the purchase.';

-- 013: reservas de checkout y recuperación de carritos abandonados.
-- Ejecutar en Supabase -> SQL Editor. Es idempotente (se puede correr más de una vez).
--
-- Antes: la verificación (KYC) se "consumía" al crear la sesión de Stripe, así que un pago
-- abandonado obligaba a repetir el KYC y la obra no quedaba reservada.
-- Ahora: la verificación se consume recién cuando el pago se completa, y cada sesión de
-- Stripe queda registrada para poder reservar la obra mientras dure.

ALTER TABLE public.purchase_verifications
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_session_status TEXT,        -- 'open' | 'completed' | 'expired'
  ADD COLUMN IF NOT EXISTS recovery_email_sent_at TIMESTAMPTZ; -- evita mandar el mail de recuperación dos veces

-- Búsqueda rápida de "¿hay una reserva abierta para esta obra?"
CREATE INDEX IF NOT EXISTS idx_pv_artwork_open
  ON public.purchase_verifications (artwork_id)
  WHERE stripe_session_status = 'open';

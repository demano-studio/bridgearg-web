# Supabase Edge Functions

## stripe-checkout

Crea una Stripe Checkout Session a partir de un ítem en la tabla `artworks`.

**Endpoint:** `POST /functions/v1/stripe-checkout`

**Body:** `{ "artworkId": number }`

**Respuesta:** `{ "url": string | null }` — URL de Stripe para redirigir al usuario.

### Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets)

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (sk_test_... o sk_live_...) |
| `SUPABASE_URL` | URL del proyecto (suele inyectarse; opcional configurarla) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para leer `artworks` |
| `CLIENT_URL` | **Requerido en producción.** URL del frontend (sin barra final). Se usa en `success_url` y `cancel_url` de Stripe. Ej: `https://tu-dominio.com`. |
| `CORS_ORIGIN` | (Opcional) Origen permitido si no coincide con `CLIENT_URL`. Puede incluir uno o varios orígenes separados por coma. |

---

## stripe-webhook

Gestiona el evento `checkout.session.completed` de Stripe: verifica la firma, actualiza `artworks.status` a `sold` (y guarda datos del comprador), envía un email de confirmación al comprador y una notificación de venta a la empresa con Resend.

**Endpoint:** `POST /functions/v1/stripe-webhook`  
Debe configurarse en Stripe como URL del webhook (con la URL pública de tu proyecto Supabase).

### Secrets

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | Signing secret del webhook en Stripe (whsec_...) |
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role para actualizar `artworks` |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM_EMAIL` | (Opcional) Remitente del email. Default: `onboarding@resend.dev` |
| `RESEND_TO_EMAIL` | Email de la empresa que recibe la notificación de venta |

### Configurar el webhook en Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://<TU_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. Eventos: `checkout.session.completed`.
4. Copiar el **Signing secret** y guardarlo en el secret `STRIPE_WEBHOOK_SIGNING_SECRET`.

---

## Variables de entorno / .env.local

Para desarrollo local, copia `supabase/functions/.env.local.example` a `supabase/functions/.env.local` y rellena los placeholders. En producción usa `supabase secrets set` (ver abajo).

## Despliegue

```bash
# Configurar secrets (una vez)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL=notifications@tudominio.com
supabase secrets set CLIENT_URL=https://tu-app.com
supabase secrets set TRADE_COUPON_ID=coupon_...
supabase secrets set ADMIN_EMAILS=admin@bridgearg.net
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set TELEGRAM_CHAT_ID=9010972015

# Desplegar funciones
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy contact-request
supabase functions deploy newsletter-subscribe
supabase functions deploy trade-apply
supabase functions deploy trade-admin
```

### Telegram (admin alerts)

| Variable | Descripción |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Token del bot (BotFather). Nunca hardcodear. |
| `TELEGRAM_CHAT_ID` | Chat destino de las alertas. |

Util compartida: `_shared/notifyAdmins.ts` (`notifyAdmins`) — Telegram + Web Push en paralelo. Eventos: pedido (stripe-webhook), mensaje (contact-request), suscriptor nuevo (newsletter-subscribe), trade nueva (trade-apply), trade APROBADO/RECHAZADO (trade-admin). Fallos de notify no bloquean la operación principal.

### Web Push (PWA admin)

| Variable | Descripción |
|----------|-------------|
| `VAPID_SUBJECT` | Contacto VAPID, ej. `mailto:ignacio.concioni@bridgearg.net` |
| `VAPID_PRIVATE_KEY` | JSON JWK `{ publicKey, privateKey }` (formato `jsr:@negrel/webpush`) |

La VAPID pública (applicationServerKey) vive en el frontend (`VITE_VAPID_PUBLIC_KEY` / `src/features/admin/pushConfig.ts`). Suscripciones en `push_subscriptions`; el SW `/admin/sw.js` muestra el push y abre la sección al toque.

## trade-admin

Panel admin del Trade Program: listar, aprobar (crea promotion code Stripe + mail Resend), rechazar, desactivar código, alta manual y reenvío de mail.

### Secrets adicionales

| Variable | Descripción |
|----------|-------------|
| `TRADE_COUPON_ID` | ID del cupón Stripe del Trade (15% off), ej. `coupon_...` o el id corto del Dashboard |
| `ADMIN_EMAILS` | Allowlist de emails admin (igual que `admin-write`), separados por coma |

## Nota sobre `artworks`

Estas funciones usan únicamente la tabla **`artworks`** y esperan `artworkId` en el body/metadata de Stripe.

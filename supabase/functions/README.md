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

# Desplegar funciones
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

## Nota sobre `artworks`

Estas funciones usan únicamente la tabla **`artworks`** y esperan `artworkId` en el body/metadata de Stripe.

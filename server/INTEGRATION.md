# Integración: Resend + Stripe Webhooks

## Flujo de contacto (frontend → backend → Resend)

- El **frontend** (Vite + React) envía el formulario con `POST` a `VITE_API_URL/api/contact` (ej. `http://localhost:3000/api/contact`). No se expone ninguna API key en el cliente.
- El **backend** (Node + Express) recibe la petición, valida el body y envía el email con **Resend**. La API key de Resend solo vive en `server/.env` (`RESEND_API_KEY`).
- **CORS** está habilitado: el servidor acepta peticiones desde el origen del frontend (`CLIENT_URL`). Por defecto se permiten `http://localhost:5173` y `http://localhost:8080`. En producción definí `CLIENT_URL` con la URL de tu sitio (ej. `https://bridgearg.com`).

---

## 1. Resend (emails de contacto)

### Obtener API Key

1. **Registro**: Entrá a [resend.com](https://resend.com) y creá una cuenta.
2. **Verificación de email**: Confirmá tu correo desde el link que te envían.
3. **API Keys**: En el dashboard, andá a **API Keys** → **Create API Key**. Dale un nombre (ej. `bridgearg-server`) y copiá el valor (empieza con `re_`). Solo se muestra una vez.
4. **Pegar en `.env`**: En `server/.env` definí:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   RESEND_TO_EMAIL=tu-email@ejemplo.com
   ```
   - `RESEND_FROM_EMAIL`: Por defecto Resend permite enviar desde `onboarding@resend.dev` (solo para pruebas). Para producción tenés que usar un dominio verificado.
   - `RESEND_TO_EMAIL`: El correo donde querés recibir los mensajes del formulario de contacto.

### Verificación de dominio (producción)

1. En Resend: **Domains** → **Add Domain**.
2. Ingresá tu dominio (ej. `bridgearg.com`).
3. Resend te da registros DNS (SPF, DKIM, etc.). Agregalos en tu proveedor de DNS.
4. Cuando el dominio esté verificado, podés usar `RESEND_FROM_EMAIL=contacto@tudominio.com` (o el subdominio que configures).

---

## 2. Stripe Webhooks

### Claves de Stripe

1. En [dashboard.stripe.com](https://dashboard.stripe.com): **Developers** → **API keys**.
2. Copiá la **Secret key** (empieza con `sk_test_` en modo test) y ponela en `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
   ```
3. **Webhook signing secret**: Lo vas a obtener al crear el webhook (paso siguiente). Se guarda como `STRIPE_WEBHOOK_SECRET=whsec_...`.

### Webhook en entorno local (Stripe CLI)

1. **Instalá Stripe CLI**: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli).
   - macOS: `brew install stripe/stripe-cli/stripe`.
2. **Login**: `stripe login`.
3. **Reenvío al servidor local**: Con el servidor Node corriendo en `http://localhost:3000`, ejecutá:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```
4. La CLI te muestra un **webhook signing secret** (ej. `whsec_...`). Copialo y ponelo en `server/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```
5. Dejá la terminal con `stripe listen` abierta mientras desarrollás. Los eventos de Stripe (pagos de prueba, etc.) se reenviarán a tu `/api/webhook`.

### Webhook en producción

1. En Stripe: **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**: `https://tu-dominio.com/api/webhook`.
3. **Eventos**: Seleccioná al menos `checkout.session.completed`.
4. Después de crear el endpoint, entrá al detalle y copiá el **Signing secret** (empieza con `whsec_`).
5. En producción, configurá la variable de entorno:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```
   (Este valor es distinto al del entorno local.)

### Shipping en Stripe

Para que Stripe pida dirección de envío y calcule costo:

1. En el dashboard: **Settings** → **Shipping and tax** (o **Shipping rates**).
2. Activá “Collect shipping address” y creá **Shipping rates** (ej. por país o por importe).
3. El endpoint `POST /api/create-checkout-session` ya usa `shipping_address_collection` con una lista de países permitidos; podés editarla en `server/src/routes/checkout.ts` si hace falta.

---

## 3. Orden de arranque

1. Crear y rellenar `server/.env` (desde `server/.env.example`).
2. En `server/`: `npm install` → `npx prisma generate` → `npx prisma db push` → `npm run db:seed`.
3. Arrancar el servidor: `npm run dev`.
4. (Opcional) Para probar webhooks en local: en otra terminal, `stripe listen --forward-to localhost:3000/api/webhook`.
5. En el frontend, definir `VITE_API_URL=http://localhost:3000` (o la URL del backend) y arrancar el cliente con `npm run dev`.

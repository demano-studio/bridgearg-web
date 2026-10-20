// @ts-nocheck
// Supabase Edge Function: creates a Stripe Checkout Session from artwork in `artworks` table.
// Runs on Deno (Supabase Cloud). Imports from https://esm.sh/
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL (required in production)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});
// ⚠️ Asegurate de que STRIPE_SECRET_KEY sea la clave live antes de producción.

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).origin;
  } catch (_e) {
    return null;
  }
}

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).toString().replace(/\/$/, "");
  } catch (_e) {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const configuredOrigins = [Deno.env.get("CLIENT_URL") ?? "", ...(Deno.env.get("CORS_ORIGIN") ?? "").split(",")];

  for (const candidate of configuredOrigins) {
    const normalized = normalizeOrigin(candidate.trim());
    if (normalized) origins.add(normalized);
  }

  return Array.from(origins);
}

function getClientUrl(): string | null {
  const value = Deno.env.get("CLIENT_URL")?.trim();
  return value ? normalizeUrl(value) : null;
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(req: Request, headers: Record<string, string> = {}): Record<string, string> {
  return { ...getCorsHeaders(req), ...headers };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  let body: { artworkId?: number; verificationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { artworkId, verificationId } = body;
  if (typeof artworkId !== "number" || artworkId < 1 || typeof verificationId !== "string" || !verificationId.trim()) {
    return new Response(JSON.stringify({ error: "artworkId and verificationId are required" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRole) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const clientUrl = getClientUrl();
  if (!clientUrl) {
    return new Response(JSON.stringify({ error: "CLIENT_URL missing or invalid" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { data: artwork, error: fetchError } = await supabase
    .from("artworks")
    .select("id, title, image_url, status, price_usd, year, medium, artists(name)")
    .eq("id", artworkId)
    .single();

  if (fetchError || !artwork) {
    return new Response(JSON.stringify({ error: "Artwork not found" }), {
      status: 404,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if ((artwork as { status?: string }).status !== "available") {
    return new Response(JSON.stringify({ error: "Artwork is not available for purchase" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { data: verification, error: verificationError } = await supabase
    .from("purchase_verifications")
    .select("id, artwork_id, status, consumed_at, stripe_session_id, stripe_session_expires_at, stripe_session_status")
    .eq("id", verificationId.trim())
    .single();

  if (verificationError || !verification) {
    return new Response(JSON.stringify({ error: "Verification is not valid for checkout" }), {
      status: 403,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (
    Number((verification as { artwork_id?: number | null }).artwork_id ?? 0) !== artworkId ||
    (verification as { status?: string }).status !== "approved" ||
    Boolean((verification as { consumed_at?: string | null }).consumed_at)
  ) {
    return new Response(JSON.stringify({ error: "Verification is not valid for checkout" }), {
      status: 403,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  // --- Carrito abandonado: reutilizar sesión abierta y reservar la obra -----------------------
  const pv = verification as {
    stripe_session_id?: string | null;
    stripe_session_expires_at?: string | null;
    stripe_session_status?: string | null;
  };

  // 1) Si esta misma verificación ya tiene una sesión de Stripe abierta, se reutiliza
  //    (el comprador volvió atrás o recargó): no se crea otra ni se repite nada.
  if (
    pv.stripe_session_id &&
    pv.stripe_session_status === "open" &&
    pv.stripe_session_expires_at &&
    new Date(pv.stripe_session_expires_at).getTime() > Date.now()
  ) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(pv.stripe_session_id);
      if (existing.status === "open" && existing.url) {
        return new Response(JSON.stringify({ url: existing.url }), {
          status: 200,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
    } catch (e) {
      console.warn("stripe-checkout: could not reuse existing session, creating a new one", e);
    }
  }

  // 2) Si OTRO comprador tiene la obra reservada (sesión abierta y vigente), se rechaza.
  const { data: reservedByOther } = await supabase
    .from("purchase_verifications")
    .select("id")
    .eq("artwork_id", artworkId)
    .eq("stripe_session_status", "open")
    .gt("stripe_session_expires_at", new Date().toISOString())
    .neq("id", verificationId.trim())
    .limit(1);

  if (reservedByOther && reservedByOther.length > 0) {
    return new Response(
      JSON.stringify({ error: "This artwork is currently reserved by another collector. Please try again later." }),
      { status: 409, headers: withCors(req, { "Content-Type": "application/json" }) },
    );
  }

  const priceUsd = Number((artwork as { price_usd?: number }).price_usd ?? 0);
  const unitAmountCents = Math.round(priceUsd * 100);
  const title = (artwork as { title: string }).title;
  const imageUrl = (artwork as { image_url: string }).image_url;
  const year = (artwork as { year?: string }).year;
  const medium = (artwork as { medium?: string }).medium;
  const artistName = ((artwork as { artists?: { name: string } }).artists?.name) ?? "";
  const description = [artistName, medium, year].filter(Boolean).join(" · ");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title,
              description: description || undefined,
              images: imageUrl.startsWith("http") ? [imageUrl] : undefined,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      // La sesión (y por lo tanto la reserva de la obra) dura 2 horas. Stripe exige entre 30 min y 24 h.
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout/cancel`,
      metadata: {
        artwork_id: String(artworkId),
        verification_id: verificationId.trim(),
      },
      shipping_address_collection: {
        allowed_countries: ["AR", "US", "MX", "CO", "ES", "FR", "DE", "GB", "IT"],
      },
    });

    // La verificación YA NO se consume acá: se consume en stripe-webhook cuando el pago se completa.
    // Acá solo se registra la sesión, que es lo que reserva la obra mientras esté abierta.
    const { error: reserveError } = await supabase
      .from("purchase_verifications")
      .update({
        stripe_session_id: session.id,
        stripe_session_status: "open",
        stripe_session_expires_at: new Date((session.expires_at ?? 0) * 1000).toISOString(),
      })
      .eq("id", verificationId.trim());

    if (reserveError) {
      // No se bloquea la compra: se loguea y se sigue (en el peor caso la obra no queda reservada).
      console.error("stripe-checkout: failed to store session reservation:", reserveError);
    }

    return new Response(JSON.stringify({ url: session.url ?? null }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }
});

// @ts-nocheck
// Supabase Edge Function: releases an open Stripe Checkout Session reservation
// (marks verification cancelled, then expires the session).
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).origin;
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

  let body: { verificationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const verificationId = typeof body.verificationId === "string" ? body.verificationId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(verificationId)) {
    return new Response(JSON.stringify({ error: "Invalid verificationId" }), {
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

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { data: verification, error: verificationError } = await supabase
    .from("purchase_verifications")
    .select("id, consumed_at, stripe_session_id, stripe_session_status")
    .eq("id", verificationId)
    .maybeSingle();

  const pv = verification as {
    id?: string;
    consumed_at?: string | null;
    stripe_session_id?: string | null;
    stripe_session_status?: string | null;
  } | null;

  if (
    verificationError ||
    !pv ||
    pv.consumed_at != null ||
    pv.stripe_session_status !== "open" ||
    !pv.stripe_session_id
  ) {
    return new Response(JSON.stringify({ released: false }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  // Primero cancelled: el webhook de checkout.session.expired no debe mandar mail de recuperación.
  await supabase
    .from("purchase_verifications")
    .update({ stripe_session_status: "cancelled" })
    .eq("id", verificationId)
    .eq("stripe_session_status", "open");

  try {
    await stripe.checkout.sessions.expire(pv.stripe_session_id);
  } catch (e) {
    console.warn("checkout-release: failed to expire Stripe session", e);
  }

  return new Response(JSON.stringify({ released: true }), {
    status: 200,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
});

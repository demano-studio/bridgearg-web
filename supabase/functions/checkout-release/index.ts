// @ts-nocheck
// Supabase Edge Function: releases an open Stripe Checkout Session reservation
// (marks verification cancelled, then expires the session).
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (optional), RESEND_FROM_EMAIL (optional), CLIENT_URL

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getClientBaseUrl(): string {
  const raw = Deno.env.get("CLIENT_URL")?.trim();
  return (raw && raw.length > 0 ? raw : "https://www.bridgearg.net").replace(/\/$/, "");
}

function buildReleaseEmailHtml(params: {
  title: string;
  artistName: string;
  resumeUrl: string;
}): string {
  const { title, artistName, resumeUrl } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your reservation has been released</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #f5f5f4; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #737373;">BridgeArg</p>
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #171717; line-height: 1.2;">Your reservation has been released</h1>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #404040;">You released your reservation for the work below. It is now available to other collectors. Your identity verification is still on file, so if you change your mind you can reserve it again without verifying twice, as long as the work is still available.</p>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 32px;">
      <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #737373;">Piece</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #171717;">${escapeHtml(title)}</p>
      ${artistName ? `<p style="margin: 8px 0 0; font-size: 14px; color: #525252;">${escapeHtml(artistName)}</p>` : ""}
    </div>
    <p style="margin: 0 0 32px;"><a href="${escapeHtml(resumeUrl)}" style="display:inline-block; background:#171717; color:#ffffff; text-decoration:none; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; padding: 14px 28px;">Reserve it again</a></p>
    <p style="margin: 24px 0 0; font-size: 13px; color: #737373;">With care,<br><strong>BridgeArg</strong></p>
  </div>
</body>
</html>
  `.trim();
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
    .select("id, consumed_at, stripe_session_id, stripe_session_status, artwork_id, buyer_email")
    .eq("id", verificationId)
    .maybeSingle();

  const pv = verification as {
    id?: string;
    consumed_at?: string | null;
    stripe_session_id?: string | null;
    stripe_session_status?: string | null;
    artwork_id?: number | null;
    buyer_email?: string | null;
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

  const buyerEmail = typeof pv.buyer_email === "string" ? pv.buyer_email.trim() : "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (buyerEmail && resendApiKey && pv.artwork_id != null) {
    try {
      const { data: artwork } = await supabase
        .from("artworks")
        .select("title, artists(name)")
        .eq("id", pv.artwork_id)
        .maybeSingle();

      const title: string = artwork?.title ?? `Artwork #${pv.artwork_id}`;
      const artistName: string = artwork?.artists?.name ?? "";
      const base = getClientBaseUrl();
      const resumeUrl = `${base}/verify/callback?resume=${encodeURIComponent(verificationId)}&artwork=${pv.artwork_id}`;
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: buyerEmail,
          subject: `Your reservation has been released — ${title}`,
          html: buildReleaseEmailHtml({ title, artistName, resumeUrl }),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("checkout-release: Resend error", res.status, text);
      }
    } catch (e) {
      console.error("checkout-release: failed to send release email", e);
    }
  }

  return new Response(JSON.stringify({ released: true }), {
    status: 200,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
});

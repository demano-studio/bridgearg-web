// Supabase Edge Function: handles Stripe checkout.session.completed.
// Runs on Deno (Supabase Cloud). Imports from https://esm.sh/
// Verifies signature, sets artwork status to 'sold', sends confirmation email via Resend.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SIGNING_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL (optional), RESEND_TO_EMAIL (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendToEmail = Deno.env.get("RESEND_TO_EMAIL")?.trim();
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature || !webhookSecret) {
    return new Response("Missing Stripe-Signature or STRIPE_WEBHOOK_SIGNING_SECRET", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400, headers: CORS_HEADERS });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const artworkIdRaw = session.metadata?.artwork_id;
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;

  if (!artworkIdRaw) {
    console.warn("checkout.session.completed without metadata.artwork_id");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const artworkId = parseInt(artworkIdRaw, 10);
  if (Number.isNaN(artworkId) || artworkId < 1) {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    return new Response("Server configuration error", { status: 500, headers: CORS_HEADERS });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const comprador = session.customer_details?.name ?? null;
  const fecha_venta = new Date().toISOString();
  const estado_pago = session.payment_status ?? "paid";

  const { error: updateError } = await supabase
    .from("artworks")
    .update({ status: "sold", comprador, fecha_venta, estado_pago })
    .eq("id", artworkId);

  if (updateError) {
    console.error("Failed to update artwork status:", updateError);
    return new Response("Error updating artwork", { status: 500, headers: CORS_HEADERS });
  }
  console.log(`Artwork ${artworkId} marked as sold.`);

  let title = "";
  let artistName = "";
  let yearMedium = "";
  let priceUsd: number | null = null;
  let imageUrl = "";

  const { data: artwork } = await supabase
    .from("artworks")
    .select("title, year, medium, price_usd, image_url, artists(name)")
    .eq("id", artworkId)
    .single();

  if (artwork) {
    title = (artwork as { title?: string }).title ?? "";
    artistName = ((artwork as { artists?: { name: string } }).artists?.name) ?? "";
    const y = (artwork as { year?: string }).year;
    const m = (artwork as { medium?: string }).medium;
    yearMedium = [y, m].filter(Boolean).join(" · ");
    const rawPrice = (artwork as { price_usd?: number | string | null }).price_usd;
    priceUsd = rawPrice == null ? null : Number(rawPrice);
    if (Number.isNaN(priceUsd)) priceUsd = null;
    imageUrl = (artwork as { image_url?: string }).image_url ?? "";
  }

  if (customerEmail && resendApiKey) {
    try {
      const html = buildConfirmationEmailHtml({ title: title || "Your piece", artistName, yearMedium });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: customerEmail,
          subject: `Your acquisition — ${title || "BridgeArg"}`,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend API error:", res.status, errText);
      } else {
        console.log(`Confirmation email sent to ${customerEmail}.`);
      }
    } catch (e) {
      console.error("Resend send failed:", e);
    }
  }

  if (resendToEmail && resendApiKey) {
    try {
      const shippingAddress = formatShippingAddress(session.customer_details?.address);
      const html = buildCompanySaleEmailHtml({
        buyerName: session.customer_details?.name ?? "Collector",
        buyerEmail: customerEmail ?? "No customer email provided",
        shippingAddress,
        title: title || `Artwork #${artworkId}`,
        artistName,
        yearMedium,
        priceUsd,
        imageUrl,
      });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: resendToEmail,
          subject: `Sale notification — ${title || `Artwork #${artworkId}`}`,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend company notification error:", res.status, errText);
      } else {
        console.log(`Sale notification email sent to ${resendToEmail}.`);
      }
    } catch (e) {
      console.error("Resend company notification failed:", e);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

function buildConfirmationEmailHtml(params: {
  title: string;
  artistName: string;
  yearMedium: string;
}): string {
  const { title, artistName, yearMedium } = params;
  const line2 = [artistName, yearMedium].filter(Boolean).join(" · ");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Acquisition confirmed</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #f5f5f4; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #737373;">BridgeArg</p>
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #171717; line-height: 1.2;">Thank you for your acquisition</h1>
    <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #404040;">Your purchase has been confirmed. We will be in touch regarding shipping and documentation.</p>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 32px;">
      <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #737373;">Piece</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #171717;">${escapeHtml(title)}</p>
      ${line2 ? `<p style="margin: 8px 0 0; font-size: 14px; color: #525252;">${escapeHtml(line2)}</p>` : ""}
    </div>
    <p style="margin: 0; font-size: 13px; color: #737373;">White-glove international shipping and export documentation are included. You will receive a Certificate of Authenticity—physical and digital—signed by the artist.</p>
    <p style="margin: 24px 0 0; font-size: 13px; color: #737373;">With care,<br><strong>BridgeArg</strong></p>
  </div>
</body>
</html>
  `.trim();
}

function buildCompanySaleEmailHtml(params: {
  buyerName: string;
  buyerEmail: string;
  shippingAddress: string | null;
  title: string;
  artistName: string;
  yearMedium: string;
  priceUsd: number | null;
  imageUrl: string;
}): string {
  const { buyerName, buyerEmail, shippingAddress, title, artistName, yearMedium, priceUsd, imageUrl } = params;
  const artworkLine2 = [artistName, yearMedium].filter(Boolean).join(" · ");
  const formattedPrice =
    priceUsd != null ? `USD ${priceUsd.toLocaleString("en-US")}` : "Price unavailable";
  const showImage = imageUrl.startsWith("http");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New sale completed</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #f5f5f4; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #737373;">BridgeArg</p>
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #171717; line-height: 1.2;">New sale completed</h1>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #737373;">Buyer</p>
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #171717;">${escapeHtml(buyerName)}</p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #525252;">${escapeHtml(buyerEmail)}</p>
      ${
        shippingAddress
          ? `<p style="margin: 12px 0 0; font-size: 14px; color: #525252;">${escapeHtml(shippingAddress)}</p>`
          : ""
      }
    </div>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #737373;">Artwork</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #171717;">${escapeHtml(title)}</p>
      ${artworkLine2 ? `<p style="margin: 8px 0 0; font-size: 14px; color: #525252;">${escapeHtml(artworkLine2)}</p>` : ""}
      <p style="margin: 12px 0 0; font-size: 14px; color: #525252;">${escapeHtml(formattedPrice)}</p>
      ${
        showImage
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="display:block; margin-top: 16px; max-width: 100%; height: auto; border: 1px solid #e5e5e5;" />`
          : ""
      }
    </div>
    <p style="margin: 0; font-size: 13px; color: #737373;">This is an automated sale notification from BridgeArg.</p>
  </div>
</body>
</html>
  `.trim();
}

function formatShippingAddress(address: Stripe.Address | null | undefined): string | null {
  if (!address) return null;
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// @ts-nocheck
// Supabase Edge Function: Contact form (honeypot + Resend + upsert_subscriber + Brevo).
// Secrets: SUPABASE_*, RESEND_*, BREVO_API_KEY, BREVO_LIST_ID
// Same Brevo list as Miami (BREVO_LIST_ID). Distinguishes via ORIGEN_BASE: "contact".
// Public form → verify_jwt = false in config.toml

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { escapeHtml, notifyAdmins } from "../_shared/notifyAdmins.ts";

const SUBJECT_VALUES = [
  "Artwork inquiry",
  "Artist representation",
  "Collector support",
  "Partnership",
  "Customer service",
] as const;

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendToEmail = Deno.env.get("RESEND_TO_EMAIL")?.trim();
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const brevoApiKey = Deno.env.get("BREVO_API_KEY")?.trim();
const brevoListId = Deno.env.get("BREVO_LIST_ID")?.trim();

const ALLOWED_ORIGINS = new Set([
  "https://www.bridgearg.net",
  "https://bridgearg.net",
]);

const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_RE.test(origin);
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function withCors(req: Request, headers: Record<string, string> = {}): Record<string, string> {
  return { ...getCorsHeaders(req), ...headers };
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function splitFullName(fullName: string): { nombre: string; apellidos: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    nombre: parts[0] || "",
    apellidos: parts.slice(1).join(" "),
  };
}

function buildInternalNoticeHtml(params: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Contact inquiry</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #fcf8ea; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px; border: 1px solid rgba(30,21,23,0.12);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7fb2d1;">BridgeArg · Contact</p>
    <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e1517;">New contact inquiry</h1>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Name:</strong> ${escapeHtml(params.fullName)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Subject:</strong> ${escapeHtml(params.subject)}</p>
      <p style="margin: 12px 0 0; font-size: 14px; color: #525252;"><strong>Message:</strong></p>
      <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: #404040; white-space: pre-wrap;">${escapeHtml(params.message || "—")}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendResendEmail(to: string | null | undefined, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey || !to) {
    console.error("contact-request: Resend not configured (RESEND_API_KEY / RESEND_TO_EMAIL)");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend API error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend send failed:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  // Honeypot (same names as Trade / Miami)
  const honeypot =
    (typeof body.website_hp === "string" && body.website_hp) ||
    (typeof body.website === "string" && body.website) ||
    (typeof body.email_address_check === "string" && body.email_address_check) ||
    "";
  if (String(honeypot).trim().length > 0) {
    return json(req, 200, { ok: true });
  }

  const fullName = asString(body.full_name ?? body.name, 120);
  const email = asString(body.email, 254).toLowerCase();
  const subject = asString(body.subject, 80);
  const message = asString(body.message, 2000);
  const consent = body.consent === true;

  if (!fullName) {
    return json(req, 400, { error: "Please enter your full name" });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, 400, { error: "Please enter a valid email" });
  }
  if (!subject || !(SUBJECT_VALUES as readonly string[]).includes(subject)) {
    return json(req, 400, { error: "Please select a subject" });
  }
  if (!message) {
    return json(req, 400, { error: "Please enter a message" });
  }
  if (!consent) {
    return json(req, 400, { error: "Please agree to the terms before submitting" });
  }

  const { nombre, apellidos } = splitFullName(fullName);
  const comentarios = `Subject: ${subject} | Message: ${message}`;

  // Source of truth: persist subscriber first. Side effects (Resend/Brevo) only after success.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("contact-request: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return json(req, 500, { error: "Could not send your message. Please try again." });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    const { error: subscriberError } = await supabase.rpc("upsert_subscriber", {
      p_email: email,
      p_source: "contact",
      p_consent: true,
    });
    if (subscriberError) {
      console.error("contact-request upsert_subscriber error:", subscriberError);
      return json(req, 500, { error: "Could not send your message. Please try again." });
    }

    const { error: messageError } = await supabase.from("contact_messages").insert({
      full_name: fullName,
      email,
      subject,
      message,
      status: "new",
      marketing_consent: true,
    });
    if (messageError) {
      console.error("contact-request contact_messages insert error:", messageError);
      return json(req, 500, { error: "Could not send your message. Please try again." });
    }
  } catch (e) {
    console.error("contact-request persist failed:", e);
    return json(req, 500, { error: "Could not send your message. Please try again." });
  }

  // After persist: Telegram is best-effort and must not affect the user response.
  await notifyAdmins("mensajes", {
    telegramHtml: `<b>(MENSAJE)</b>\n${escapeHtml(fullName)} — ${escapeHtml(subject)}\n${escapeHtml(email)}`,
    title: "Nuevo mensaje",
    body: `${fullName} — ${subject}`,
    url: "/admin/mensajes",
  });

  const mailOk = await sendResendEmail(
    resendToEmail,
    `Contact inquiry — ${fullName} · ${subject}`,
    buildInternalNoticeHtml({ fullName, email, subject, message }),
  );
  if (!mailOk) {
    console.error("contact-request: Resend notification failed after successful upsert");
  }

  // Same Brevo list as Miami (BREVO_LIST_ID). Trade keeps BREVO_TRADE_LIST_ID untouched.
  if (brevoApiKey && brevoListId) {
    try {
      const listId = Number(brevoListId);
      if (!Number.isFinite(listId)) {
        console.error("contact-request: BREVO_LIST_ID is not a valid number");
      } else {
        const res = await fetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify({
            email,
            attributes: {
              NOMBRE: nombre,
              APELLIDOS: apellidos || undefined,
              CARGO: subject,
              COMETARIOS: comentarios,
              ORIGEN_BASE: "contact",
            },
            listIds: [listId],
            updateEnabled: true,
          }),
        });
        if (!res.ok) {
          console.error("Brevo contacts error:", res.status, await res.text());
        }
      }
    } catch (e) {
      console.error("Brevo contacts failed:", e);
    }
  } else {
    console.error("contact-request: BREVO_API_KEY / BREVO_LIST_ID not configured");
  }

  return json(req, 200, { ok: true });
});

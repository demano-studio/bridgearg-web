// @ts-nocheck
// Supabase Edge Function: Miami Art Week coffee request (honeypot + Resend + upsert_subscriber + Brevo).
// Secrets: SUPABASE_*, RESEND_*, BREVO_API_KEY, BREVO_LIST_ID
// Public form → verify_jwt = false in config.toml

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function composeComentarios(params: {
  studio: string;
  dias: string;
  horario: string;
  lugar: string;
  nota: string;
}): string {
  const parts = ["Miami Art Week 2026"];
  if (params.studio) parts.push("Studio: " + params.studio);
  parts.push("Days: " + (params.dias || "Any"));
  if (params.horario) parts.push("Time: " + params.horario);
  if (params.lugar) parts.push("Place: " + params.lugar);
  if (params.nota) parts.push("Note: " + params.nota);
  return parts.join(" | ");
}

function buildInternalNoticeHtml(params: {
  nombre: string;
  apellidos: string;
  email: string;
  whatsapp: string;
  studio: string;
  cargo: string;
  rubro: string;
  web: string;
  dias: string;
  horario: string;
  lugar: string;
  nota: string;
  comentarios: string;
}): string {
  const p = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Miami coffee request</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #fcf8ea; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px; border: 1px solid rgba(30,21,23,0.12);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7fb2d1;">BridgeArg · Miami</p>
    <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e1517;">New coffee request</h1>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Name:</strong> ${escapeHtml(p.nombre)} ${escapeHtml(p.apellidos)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Email:</strong> ${escapeHtml(p.email)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>WhatsApp:</strong> ${escapeHtml(p.whatsapp || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Studio:</strong> ${escapeHtml(p.studio || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Role:</strong> ${escapeHtml(p.cargo || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>You are:</strong> ${escapeHtml(p.rubro || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Web:</strong> ${escapeHtml(p.web || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Days:</strong> ${escapeHtml(p.dias || "Any")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Time:</strong> ${escapeHtml(p.horario || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Place:</strong> ${escapeHtml(p.lugar || "—")}</p>
      <p style="margin: 12px 0 0; font-size: 14px; color: #525252;"><strong>Note:</strong></p>
      <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: #404040; white-space: pre-wrap;">${escapeHtml(p.nota || "—")}</p>
      <p style="margin: 16px 0 0; font-size: 12px; color: #737373;"><strong>COMETARIOS:</strong> ${escapeHtml(p.comentarios)}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendResendEmail(to: string | null | undefined, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey || !to) {
    console.error("miami-request: Resend not configured (RESEND_API_KEY / RESEND_TO_EMAIL)");
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

  // Honeypot (website / website_hp / email_address_check)
  const honeypot =
    (typeof body.website_hp === "string" && body.website_hp) ||
    (typeof body.website === "string" && body.website) ||
    (typeof body.email_address_check === "string" && body.email_address_check) ||
    "";
  if (String(honeypot).trim().length > 0) {
    return json(req, 200, { ok: true });
  }

  const nombre = asString(body.nombre, 80);
  const apellidos = asString(body.apellidos, 80);
  const email = asString(body.email, 254).toLowerCase();
  const whatsapp = asString(body.whatsapp, 40);
  const studio = asString(body.studio, 160);
  const cargo = asString(body.cargo, 120);
  const rubro = asString(body.rubro, 80);
  const web = asString(body.web, 300);
  const horario = asString(body.horario, 80);
  const lugar = asString(body.lugar, 120);
  const nota = asString(body.nota, 2000);
  const consent = body.consent === true;

  let dias = "";
  if (Array.isArray(body.dias)) {
    dias = body.dias.map((d) => String(d).trim()).filter(Boolean).join(", ").slice(0, 500);
  } else {
    dias = asString(body.dias, 500);
  }

  if (!nombre) {
    return json(req, 400, { error: "Please add your first name" });
  }
  if (!apellidos) {
    return json(req, 400, { error: "Please add your last name" });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(req, 400, { error: "A valid email is required" });
  }
  if (!rubro) {
    return json(req, 400, { error: "Please select who you are" });
  }
  if (!consent) {
    return json(req, 400, { error: "Please agree to be contacted before submitting" });
  }

  const comentarios = composeComentarios({ studio, dias, horario, lugar, nota });

  let mailOk = false;
  let dbOk = false;
  let brevoOk = false;

  // (1) Internal Resend notice
  mailOk = await sendResendEmail(
    resendToEmail,
    `Miami coffee request — ${nombre} ${apellidos}`,
    buildInternalNoticeHtml({
      nombre,
      apellidos,
      email,
      whatsapp,
      studio,
      cargo,
      rubro,
      web,
      dias,
      horario,
      lugar,
      nota,
      comentarios,
    }),
  );

  // (2) Local subscribers table
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && supabaseServiceRole) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRole);
      const { error: subscriberError } = await supabase.rpc("upsert_subscriber", {
        p_email: email,
        p_source: "miami",
        p_consent: true,
      });
      if (subscriberError) {
        console.error("miami-request upsert_subscriber error:", subscriberError);
      } else {
        dbOk = true;
      }
    } catch (e) {
      console.error("miami-request upsert_subscriber failed:", e);
    }
  } else {
    console.error("miami-request: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  // (3) Brevo contact upsert
  if (brevoApiKey && brevoListId) {
    try {
      const listId = Number(brevoListId);
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
            APELLIDOS: apellidos,
            CARGO: cargo || undefined,
            RUBRO: rubro || undefined,
            WEB: web || undefined,
            WHATSAPP: whatsapp || undefined,
            COMETARIOS: comentarios,
            ORIGEN_BASE: "Miami Art Week 2026 · landing",
          },
          listIds: [listId],
          updateEnabled: true,
        }),
      });
      if (!res.ok) {
        console.error("Brevo contacts error:", res.status, await res.text());
      } else {
        brevoOk = true;
      }
    } catch (e) {
      console.error("Brevo contacts failed:", e);
    }
  } else {
    console.error("miami-request: BREVO_API_KEY / BREVO_LIST_ID not configured");
  }

  if (!mailOk && !dbOk && !brevoOk) {
    return json(req, 500, { error: "Could not submit your request. Please try again." });
  }

  return json(req, 200, { ok: true });
});

// @ts-nocheck
// Supabase Edge Function: Trade Program application (honeypot + insert + Resend + Brevo).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL, RESEND_*, BREVO_API_KEY, BREVO_TRADE_LIST_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ROLE_VALUES = [
  "interior_designer",
  "architect",
  "developer",
  "art_consultant",
  "other",
] as const;

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendToEmail = Deno.env.get("RESEND_TO_EMAIL")?.trim();
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const brevoApiKey = Deno.env.get("BREVO_API_KEY")?.trim();
const brevoTradeListId = Deno.env.get("BREVO_TRADE_LIST_ID")?.trim();

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

function roleLabel(role: string): string {
  switch (role) {
    case "interior_designer":
      return "Interior designer";
    case "architect":
      return "Architect";
    case "developer":
      return "Developer";
    case "art_consultant":
      return "Art consultant";
    case "other":
      return "Other";
    default:
      return role;
  }
}

async function sendResendEmail(to: string | null | undefined, subject: string, html: string): Promise<void> {
  if (!resendApiKey || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend API error:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Resend send failed:", e);
  }
}

function splitFullName(fullName: string): { nombre: string; apellidos: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    nombre: parts[0] || "",
    apellidos: parts.slice(1).join(" "),
  };
}

/** Best-effort Brevo upsert. Never throws; skips silently if secrets are missing. */
async function syncBrevoTradePending(params: {
  email: string;
  fullName: string;
  role: string;
  website: string;
  message: string;
}): Promise<void> {
  if (!brevoApiKey || !brevoTradeListId) return;
  const listId = Number(brevoTradeListId);
  if (!Number.isFinite(listId)) {
    console.error("trade-apply: BREVO_TRADE_LIST_ID is not a valid number");
    return;
  }
  const { nombre, apellidos } = splitFullName(params.fullName);
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        email: params.email,
        updateEnabled: true,
        listIds: [listId],
        attributes: {
          NOMBRE: nombre,
          APELLIDOS: apellidos,
          CARGO: params.role,
          WEB: params.website || undefined,
          COMETARIOS: params.message || undefined,
          ORIGEN_BASE: "trade",
          TRADE_ESTADO: "pending",
        },
      }),
    });
    if (!res.ok) {
      console.error("trade-apply Brevo contacts error:", res.status, await res.text());
    }
  } catch (e) {
    console.error("trade-apply Brevo contacts failed:", e);
  }
}

function buildApplicantConfirmationHtml(fullName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>We received your application</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #fcf8ea; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 48px 40px; border: 1px solid rgba(30,21,23,0.12);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7fb2d1;">BridgeArg</p>
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #1e1517; line-height: 1.2;">We received your application</h1>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #404040;">Dear ${escapeHtml(fullName || "collector")},</p>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #404040;">Thank you for applying to the BridgeArg Trade Program. We have received your request and will review it carefully.</p>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #404040;">You can expect a response within <strong>48 business hours</strong>.</p>
    <p style="margin: 0; font-size: 13px; color: #737373;">With care,<br><strong style="color:#1e1517;">BridgeArg</strong></p>
  </div>
</body>
</html>
  `.trim();
}

function buildInternalNoticeHtml(params: {
  fullName: string;
  email: string;
  company: string;
  website: string;
  role: string;
  projectType: string;
  message: string;
  marketing: boolean;
}): string {
  const { fullName, email, company, website, role, projectType, message, marketing } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Trade Program application</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #f5f5f4; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; padding: 40px;">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7fb2d1;">BridgeArg</p>
    <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e1517;">New Trade Program application</h1>
    <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Company:</strong> ${escapeHtml(company)}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Website:</strong> ${escapeHtml(website || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Role:</strong> ${escapeHtml(roleLabel(role))}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Project type:</strong> ${escapeHtml(projectType || "—")}</p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #525252;"><strong>Marketing consent:</strong> ${marketing ? "Yes" : "No"}</p>
      <p style="margin: 12px 0 0; font-size: 14px; color: #525252;"><strong>Message:</strong></p>
      <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: #404040; white-space: pre-wrap;">${escapeHtml(message || "—")}</p>
    </div>
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  // Honeypot: bots that fill website_hp get a fake success without writing.
  if (typeof body.website_hp === "string" && body.website_hp.trim().length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const projectType = typeof body.project_type === "string" ? body.project_type.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const marketing = body.marketing === true;

  if (!fullName || fullName.length > 120) {
    return new Response(JSON.stringify({ error: "A valid full name is required (max 120 characters)" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "A valid email is required" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (!company || company.length > 160) {
    return new Response(JSON.stringify({ error: "A valid company name is required (max 160 characters)" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (!(ROLE_VALUES as readonly string[]).includes(role)) {
    return new Response(
      JSON.stringify({
        error: "Please select a valid role (interior designer, architect, developer, art consultant, or other)",
      }),
      { status: 400, headers: withCors(req, { "Content-Type": "application/json" }) },
    );
  }

  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: "Message must be at most 2000 characters" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (website.length > 300) {
    return new Response(JSON.stringify({ error: "Website must be at most 300 characters" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (projectType.length > 160) {
    return new Response(JSON.stringify({ error: "Project type must be at most 160 characters" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRole) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPending } = await supabase
    .from("trade_applications")
    .select("id")
    .eq("email", email)
    .eq("status", "pending")
    .gte("created_at", since)
    .limit(1);

  if (recentPending && recentPending.length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { error: insertError } = await supabase.from("trade_applications").insert({
    full_name: fullName,
    email,
    company,
    website: website || null,
    role,
    project_type: projectType || null,
    message: message || null,
    status: "pending",
    marketing_consent: marketing,
  });

  if (insertError) {
    console.error("trade-apply insert error:", insertError);
    return new Response(JSON.stringify({ error: "Could not submit application" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  await syncBrevoTradePending({
    email,
    fullName,
    role,
    website,
    message,
  });

  const { error: subscriberError } = await supabase.rpc("upsert_subscriber", {
    p_email: email,
    p_source: "trade",
    p_consent: marketing,
  });
  if (subscriberError) {
    console.error("trade-apply upsert_subscriber error:", subscriberError);
  }

  await sendResendEmail(
    resendToEmail,
    `New Trade Program application — ${fullName}`,
    buildInternalNoticeHtml({
      fullName,
      email,
      company,
      website,
      role,
      projectType,
      message,
      marketing,
    }),
  );

  await sendResendEmail(
    email,
    "We received your Trade Program application — BridgeArg",
    buildApplicantConfirmationHtml(fullName),
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
});

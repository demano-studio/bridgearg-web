// @ts-nocheck
// Supabase Edge Function: Trade Program admin (list / approve / reject / deactivate / create / resend).
// Auth: JWT + ADMIN_EMAILS allowlist (same as admin-write).
// Secrets: STRIPE_SECRET_KEY, TRADE_COUPON_ID, ADMIN_EMAILS, RESEND_*, CLIENT_URL, SUPABASE_*, BREVO_API_KEY, BREVO_TRADE_LIST_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.7.0?target=denonext";

const ROLE_VALUES = [
  "interior_designer",
  "architect",
  "developer",
  "art_consultant",
  "other",
] as const;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
});

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const clientUrl = (Deno.env.get("CLIENT_URL") ?? "https://www.bridgearg.net").replace(/\/$/, "");
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

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
}

function parseAdminEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanStripeError(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  if (/No such coupon/i.test(msg)) {
    return "The Trade coupon is not configured correctly in Stripe. Check TRADE_COUPON_ID.";
  }
  if (/already exists|duplicate/i.test(msg)) {
    return "That promotion code already exists in Stripe. Try approving again.";
  }
  if (/Invalid API Key|api[_ ]?key/i.test(msg)) {
    return "Stripe is not configured correctly. Check STRIPE_SECRET_KEY.";
  }
  if (msg) return msg.length > 180 ? `${msg.slice(0, 177)}…` : msg;
  return "Could not create the promotion code in Stripe. Please try again.";
}

function companyCodePart(company: string): string {
  const cleaned = company
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 18);
  return cleaned || "CLIENT";
}

function randomSuffix(length = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function buildPromoCode(company: string): string {
  return `TRADE-${companyCodePart(company)}-${randomSuffix(4)}`;
}

function buildApprovalEmailHtml(params: { fullName: string; promoCode: string }): string {
  const { fullName, promoCode } = params;
  const browseUrl = `${clientUrl}/artworks`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to the BridgeArg Trade Program</title></head>
<body style="margin:0; font-family: Georgia, 'Times New Roman', serif; background: #fcf8ea; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 48px 40px; border: 1px solid rgba(30,21,23,0.12);">
    <p style="margin:0 0 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7fb2d1;">BridgeArg</p>
    <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 600; color: #1e1517; line-height: 1.2;">Welcome to the Trade Program</h1>
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #404040;">Dear ${escapeHtml(fullName || "colleague")},</p>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #404040;">Your application has been approved. You can now use your Trade Program pricing on every acquisition.</p>
    <div style="border: 1px solid #7fb2d1; background: rgba(127,178,209,0.10); padding: 28px 24px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 10px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #7fb2d1;">Your code</p>
      <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; letter-spacing: 0.06em; color: #1e1517;">${escapeHtml(promoCode)}</p>
    </div>
    <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #404040;">At checkout, click <strong>“Add promotion code”</strong> and enter it to receive <strong>15% off</strong> your acquisition.</p>
    <p style="margin: 0 0 32px;">
      <a href="${escapeHtml(browseUrl)}" style="display:inline-block; background:#7fb2d1; color:#1e1517; text-decoration:none; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; padding: 14px 28px; border: 1px solid #7fb2d1;">Browse the collection</a>
    </p>
    <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #737373;">Reply to this email if you'd like us to put together a selection for your project.</p>
    <p style="margin: 24px 0 0; font-size: 13px; color: #737373;">With care,<br><strong style="color:#1e1517;">BridgeArg</strong></p>
  </div>
</body>
</html>
  `.trim();
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!resendApiKey) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", res.status, errText);
      return { ok: false, error: "Could not send the approval email. Try Resend email again later." };
    }
    return { ok: true };
  } catch (e) {
    console.error("Resend send failed:", e);
    return { ok: false, error: "Could not send the approval email. Check your connection and try again." };
  }
}

async function ensureStripeCustomer(
  row: TradeRow,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  if (row.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(row.stripe_customer_id);
      if (existing && !("deleted" in existing && existing.deleted)) {
        return { ok: true, customerId: existing.id };
      }
    } catch (err) {
      console.warn("trade-admin: stored stripe_customer_id not usable, looking up by email", err);
    }
  }

  try {
    const listed = await stripe.customers.list({ email: row.email, limit: 1 });
    if (listed.data[0]) {
      return { ok: true, customerId: listed.data[0].id };
    }

    const created = await stripe.customers.create({
      name: row.full_name,
      email: row.email,
      metadata: { trade_application_id: row.id },
    });
    return { ok: true, customerId: created.id };
  } catch (err) {
    console.error("trade-admin ensureStripeCustomer:", err);
    return { ok: false, error: humanStripeError(err) };
  }
}

async function createStripePromo(params: {
  company: string;
  applicationId: string;
  couponId: string;
  customerId: string;
}): Promise<{ ok: true; code: string; stripeId: string } | { ok: false; error: string }> {
  const { company, applicationId, couponId, customerId } = params;
  let lastError = "Could not create the promotion code in Stripe.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = buildPromoCode(company);
    try {
      const promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: couponId },
        code,
        active: true,
        customer: customerId,
        metadata: { trade_application_id: applicationId },
      });
      return { ok: true, code: promo.code, stripeId: promo.id };
    } catch (err) {
      lastError = humanStripeError(err);
      console.error("trade-admin stripe promotionCodes.create:", err);
      if (!/already exists|duplicate/i.test(String((err as { message?: string })?.message ?? ""))) {
        return { ok: false, error: lastError };
      }
    }
  }
  return { ok: false, error: lastError };
}

type TradeRow = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  company: string;
  website: string | null;
  role: string;
  project_type: string | null;
  message: string | null;
  status: string;
  approved_at: string | null;
  marketing_consent: boolean;
  promo_code: string | null;
  stripe_promotion_code_id: string | null;
  stripe_customer_id: string | null;
  notes: string | null;
  source: string;
  deactivated_at: string | null;
};

function hasActivePromo(row: TradeRow): boolean {
  return Boolean(row.stripe_promotion_code_id && !row.deactivated_at);
}

type BrevoTradeEstado = "approved" | "rejected" | "deactivated" | "pending";

/**
 * Best-effort Brevo upsert (POST /v3/contacts + updateEnabled).
 * Never throws; skips silently if secrets are missing.
 * Pass promoCode only on approve so TRADE_CODIGO is set; other estados leave it untouched.
 */
async function updateBrevoTradeEstado(
  email: string,
  estado: BrevoTradeEstado,
  promoCode?: string | null,
): Promise<void> {
  if (!brevoApiKey || !brevoTradeListId) return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  const listId = Number(brevoTradeListId);
  if (!Number.isFinite(listId)) {
    console.error("trade-admin: BREVO_TRADE_LIST_ID is not a valid number");
    return;
  }
  const attributes: Record<string, string> = {
    TRADE_ESTADO: estado,
    ORIGEN_BASE: "trade",
  };
  const code = typeof promoCode === "string" ? promoCode.trim() : "";
  if (code) {
    attributes.TRADE_CODIGO = code;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": brevoApiKey,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        email: normalizedEmail,
        updateEnabled: true,
        listIds: [listId],
        attributes,
      }),
    });
    if (!res.ok) {
      console.error("trade-admin Brevo contact update error:", res.status, normalizedEmail);
    }
  } catch (e) {
    console.error("trade-admin Brevo contact update failed:", e);
  }
}

async function persistApproval(
  supabase: ReturnType<typeof createClient>,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true; row: TradeRow } | { ok: false; error: string }> {
  const { data: updated, error: updateError } = await supabase
    .from("trade_applications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("trade-admin approve update error:", updateError);
    return {
      ok: false,
      error: "The Stripe objects were created, but we could not save them. Contact support with this application id.",
    };
  }
  return { ok: true, row: updated as TradeRow };
}

/** Deactivates the Stripe promo when still active. Does not touch the DB. */
async function deactivateStripePromoIfActive(
  row: TradeRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasActivePromo(row) || !row.stripe_promotion_code_id) {
    return { ok: true };
  }
  try {
    await stripe.promotionCodes.update(row.stripe_promotion_code_id, { active: false });
    return { ok: true };
  } catch (err) {
    console.error("trade-admin deactivateStripePromoIfActive:", err);
    return { ok: false, error: humanStripeError(err) };
  }
}

async function approveApplication(
  supabase: ReturnType<typeof createClient>,
  row: TradeRow,
  couponId: string,
): Promise<{ ok: true; row: TradeRow } | { ok: false; error: string }> {
  // Idempotent: already approved with an active code (+ customer when present).
  if (
    row.status === "approved" &&
    row.promo_code &&
    row.stripe_promotion_code_id &&
    row.stripe_customer_id &&
    !row.deactivated_at
  ) {
    await updateBrevoTradeEstado(row.email, "approved", row.promo_code);
    return { ok: true, row };
  }

  const customer = await ensureStripeCustomer(row);
  if (!customer.ok) return customer;

  // Legacy unrestricted code (approved, active, no customer): replace with restricted.
  // Or any previously active code that must be rotated (e.g. re-approve after deactivate).
  const needsNewCode =
    !(row.status === "approved" && row.promo_code && row.stripe_promotion_code_id && !row.deactivated_at) ||
    !row.stripe_customer_id;

  if (!needsNewCode) {
    // Active code exists but customer id only missing in DB — should be rare after ensure.
    const saved = await persistApproval(supabase, row.id, {
      stripe_customer_id: customer.customerId,
      status: "approved",
    });
    if (saved.ok) {
      await updateBrevoTradeEstado(saved.row.email, "approved", saved.row.promo_code);
    }
    return saved;
  }

  if (hasActivePromo(row)) {
    const deactivated = await deactivateStripePromoIfActive(row);
    if (!deactivated.ok) return deactivated;
  }

  const promo = await createStripePromo({
    company: row.company,
    applicationId: row.id,
    couponId,
    customerId: customer.customerId,
  });
  if (!promo.ok) return promo;

  const saved = await persistApproval(supabase, row.id, {
    status: "approved",
    approved_at: new Date().toISOString(),
    promo_code: promo.code,
    stripe_promotion_code_id: promo.stripeId,
    stripe_customer_id: customer.customerId,
    deactivated_at: null,
  });
  if (!saved.ok) return saved;

  await sendResendEmail(
    saved.row.email,
    "Welcome to the BridgeArg Trade Program",
    buildApprovalEmailHtml({ fullName: saved.row.full_name, promoCode: promo.code }),
  );

  // After DB + Resend: Brevo upsert with TRADE_CODIGO (best-effort; never blocks approval/email).
  await updateBrevoTradeEstado(saved.row.email, "approved", promo.code);

  return { ok: true, row: saved.row };
}

function validateCreateFields(body: Record<string, unknown>):
  | { ok: true; fullName: string; email: string; company: string; role: string; notes: string }
  | { ok: false; error: string } {
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!fullName || fullName.length > 120) {
    return { ok: false, error: "A valid full name is required (max 120 characters)." };
  }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!company || company.length > 160) {
    return { ok: false, error: "A valid company name is required (max 160 characters)." };
  }
  if (!(ROLE_VALUES as readonly string[]).includes(role)) {
    return {
      ok: false,
      error: "Please select a valid role (interior designer, architect, developer, art consultant, or other).",
    };
  }
  if (notes.length > 2000) {
    return { ok: false, error: "Notes must be at most 2000 characters." };
  }

  return { ok: true, fullName, email, company, role, notes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS");
  const couponId = Deno.env.get("TRADE_COUPON_ID")?.trim();

  if (!supabaseUrl || !supabaseServiceRole || !supabaseAnonKey || !adminEmailsRaw) {
    return json(req, 500, { error: "Server configuration error" });
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return json(req, 401, { error: "Unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return json(req, 401, { error: "Unauthorized" });

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return json(req, 401, { error: "Unauthorized" });
  }

  const email = authData.user.email?.trim().toLowerCase() ?? "";
  const adminEmails = parseAdminEmails(adminEmailsRaw);
  if (!email || !adminEmails.has(email)) {
    return json(req, 403, { error: "Forbidden" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!action) return json(req, 400, { error: "Missing action" });

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  if (action === "list") {
    const status = typeof body.status === "string" ? body.status.trim() : "";
    let query = supabase.from("trade_applications").select("*").order("created_at", { ascending: false });
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) {
      console.error("trade-admin list error:", error);
      return json(req, 500, { error: "Could not load Trade applications." });
    }
    return json(req, 200, { ok: true, applications: data ?? [] });
  }

  if (action === "approve") {
    if (!couponId) {
      return json(req, 500, { error: "TRADE_COUPON_ID is not configured." });
    }
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });

    const result = await approveApplication(supabase, row as TradeRow, couponId);
    if (!result.ok) return json(req, 400, { error: result.error });
    return json(req, 200, { ok: true, application: result.row });
  }

  if (action === "reject") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });
    const app = row as TradeRow;

    if (app.status === "rejected") {
      return json(req, 200, { ok: true, application: app });
    }

    const deactivated = await deactivateStripePromoIfActive(app);
    if (!deactivated.ok) return json(req, 400, { error: deactivated.error });

    const patch: Record<string, unknown> = { status: "rejected" };
    if (hasActivePromo(app)) {
      patch.deactivated_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("trade_applications")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("trade-admin reject error:", updateError);
      return json(req, 500, { error: "Could not reject the application." });
    }
    const rejectEmail = (updated as TradeRow)?.email?.trim();
    if (rejectEmail) {
      try {
        await updateBrevoTradeEstado(rejectEmail, "rejected");
      } catch (e) {
        console.error("trade-admin Brevo sync unexpected error (reject):", e);
      }
    }
    return json(req, 200, { ok: true, application: updated });
  }

  if (action === "reopen") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });
    const app = row as TradeRow;

    if (app.status === "pending" && !hasActivePromo(app)) {
      return json(req, 200, { ok: true, application: app });
    }

    const deactivated = await deactivateStripePromoIfActive(app);
    if (!deactivated.ok) return json(req, 400, { error: deactivated.error });

    const patch: Record<string, unknown> = {
      status: "pending",
      approved_at: null,
    };
    if (hasActivePromo(app) || app.deactivated_at) {
      // Keep historical promo fields; mark inactive if we just turned it off.
      if (hasActivePromo(app)) {
        patch.deactivated_at = new Date().toISOString();
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("trade_applications")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("trade-admin reopen error:", updateError);
      return json(req, 500, { error: "Could not reopen the application." });
    }
    const reopenEmail = (updated as TradeRow)?.email?.trim();
    if (reopenEmail) {
      try {
        await updateBrevoTradeEstado(reopenEmail, "pending");
      } catch (e) {
        console.error("trade-admin Brevo sync unexpected error (reopen):", e);
      }
    }
    return json(req, 200, { ok: true, application: updated });
  }

  if (action === "delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });
    const app = row as TradeRow;

    const deactivated = await deactivateStripePromoIfActive(app);
    if (!deactivated.ok) {
      return json(req, 400, {
        error: deactivated.error || "Could not deactivate the Stripe code. The application was not deleted.",
      });
    }

    const { error: deleteError } = await supabase.from("trade_applications").delete().eq("id", id);
    if (deleteError) {
      console.error("trade-admin delete error:", deleteError);
      return json(req, 500, { error: "Could not delete the application. Please try again." });
    }
    return json(req, 200, { ok: true, deleted: true, id });
  }

  if (action === "deactivate") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });
    const app = row as TradeRow;

    if (!app.stripe_promotion_code_id) {
      return json(req, 400, { error: "This application has no Stripe promotion code to deactivate." });
    }
    if (app.deactivated_at) {
      return json(req, 200, { ok: true, application: app });
    }

    const deactivated = await deactivateStripePromoIfActive(app);
    if (!deactivated.ok) return json(req, 400, { error: deactivated.error });

    const deactivatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("trade_applications")
      .update({ deactivated_at: deactivatedAt })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("trade-admin deactivate update error:", updateError);
      return json(req, 500, {
        error: "The code was deactivated in Stripe, but we could not save the change. Refresh and check again.",
      });
    }
    const deactivateEmail = (updated as TradeRow)?.email?.trim();
    if (deactivateEmail) {
      try {
        await updateBrevoTradeEstado(deactivateEmail, "deactivated");
      } catch (e) {
        console.error("trade-admin Brevo sync unexpected error (deactivate):", e);
      }
    }
    return json(req, 200, { ok: true, application: updated });
  }

  if (action === "create") {
    if (!couponId) {
      return json(req, 500, { error: "TRADE_COUPON_ID is not configured." });
    }
    const validated = validateCreateFields(body);
    if (!validated.ok) return json(req, 400, { error: validated.error });

    const { data: inserted, error: insertError } = await supabase
      .from("trade_applications")
      .insert({
        full_name: validated.fullName,
        email: validated.email,
        company: validated.company,
        role: validated.role,
        notes: validated.notes || null,
        status: "pending",
        source: "manual",
        marketing_consent: false,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("trade-admin create insert error:", insertError);
      return json(req, 500, { error: "Could not create the Trade client." });
    }

    const result = await approveApplication(supabase, inserted as TradeRow, couponId);
    if (!result.ok) {
      return json(req, 400, {
        error: result.error,
        application: inserted,
      });
    }
    return json(req, 200, { ok: true, application: result.row });
  }

  if (action === "resend_email") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json(req, 400, { error: "Missing application id." });

    const { data: row, error } = await supabase.from("trade_applications").select("*").eq("id", id).maybeSingle();
    if (error || !row) return json(req, 404, { error: "Application not found." });
    const app = row as TradeRow;

    if (app.status !== "approved" || !app.promo_code) {
      return json(req, 400, { error: "Only approved applications with a code can receive the welcome email." });
    }
    if (app.deactivated_at) {
      return json(req, 400, { error: "This code is deactivated. The welcome email was not sent." });
    }

    const mail = await sendResendEmail(
      app.email,
      "Welcome to the BridgeArg Trade Program",
      buildApprovalEmailHtml({ fullName: app.full_name, promoCode: app.promo_code }),
    );
    if (!mail.ok) return json(req, 500, { error: mail.error });
    return json(req, 200, { ok: true, application: app });
  }

  return json(req, 400, { error: "Unknown action" });
});

// @ts-nocheck
// Owner-only team ops: invite / revokeAccess / deleteUser.
import { authorizeAdminRequest, INVITE_DEFAULT_SECTIONS } from "../_shared/adminAuth.ts";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).origin;
  } catch (_e) {
    return null;
  }
}

const LOCAL_DEV_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function getAllowedOrigins(): string[] {
  const origins = new Set<string>(["https://www.bridgearg.net", "https://bridgearg.net"]);
  const configuredOrigins = [Deno.env.get("CLIENT_URL") ?? "", ...(Deno.env.get("CORS_ORIGIN") ?? "").split(",")];
  for (const candidate of configuredOrigins) {
    const normalized = normalizeOrigin(candidate.trim());
    if (normalized) origins.add(normalized);
  }
  return Array.from(origins);
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (LOCAL_DEV_ORIGIN_RE.test(origin)) return true;
  return getAllowedOrigins().includes(origin);
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

async function assertOwner(auth: {
  isOwner: boolean;
  user: { id: string };
  supabase: { from: (t: string) => unknown };
}): Promise<boolean> {
  if (auth.isOwner) return true;
  const { data: row } = await auth.supabase
    .from("admin_users")
    .select("is_owner")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return Boolean(row?.is_owner);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  const authResult = await authorizeAdminRequest(req, { ownerOnly: true });
  if (!authResult.ok) {
    return json(req, authResult.status, { error: authResult.error });
  }
  if (!(await assertOwner(authResult.auth))) {
    return json(req, 403, { error: "Solo el owner puede gestionar el equipo." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON body" });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "invite";
  const { supabase, user: caller } = authResult.auth;

  // ─── revokeAccess ───────────────────────────────────────────
  if (action === "revokeAccess") {
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    if (!userId) return json(req, 400, { error: "user_id required" });
    if (userId === caller.id) {
      return json(req, 400, { error: "No podés revocarte a vos mismo." });
    }

    const { data: target, error: targetErr } = await supabase
      .from("admin_users")
      .select("user_id,email,is_owner")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetErr) return json(req, 500, { error: targetErr.message });
    if (!target) return json(req, 404, { error: "Miembro no encontrado" });
    if (target.is_owner) return json(req, 400, { error: "No se puede revocar al owner." });

    const rows = INVITE_DEFAULT_SECTIONS.map((s) => ({
      user_id: userId,
      section: s.section,
      can_view: false,
      can_edit: false,
    }));
    const { error: upsertErr } = await supabase.from("admin_permissions").upsert(rows, {
      onConflict: "user_id,section",
    });
    if (upsertErr) return json(req, 500, { error: upsertErr.message });

    return json(req, 200, { ok: true, revoked: true, user_id: userId, email: target.email });
  }

  // ─── deleteUser ─────────────────────────────────────────────
  if (action === "deleteUser") {
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    if (!userId) return json(req, 400, { error: "user_id required" });
    if (userId === caller.id) {
      return json(req, 400, { error: "No podés eliminarte a vos mismo." });
    }

    const { data: target, error: targetErr } = await supabase
      .from("admin_users")
      .select("user_id,email,is_owner")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetErr) return json(req, 500, { error: targetErr.message });
    if (!target) return json(req, 404, { error: "Miembro no encontrado" });
    if (target.is_owner) return json(req, 400, { error: "No se puede eliminar al owner." });

    // Cascades admin_users / admin_permissions via FK ON DELETE CASCADE
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
    if (delErr) return json(req, 500, { error: delErr.message || "No se pudo eliminar la cuenta" });

    // Ensure admin row gone even if cascade missed (shouldn't)
    await supabase.from("admin_users").delete().eq("user_id", userId);

    return json(req, 200, { ok: true, deleted: true, user_id: userId, email: target.email });
  }

  // ─── invite (default) ───────────────────────────────────────
  if (action !== "invite") {
    return json(req, 400, { error: "Unknown action" });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json(req, 400, { error: "Email inválido" });
  }

  const clientUrl = (Deno.env.get("CLIENT_URL") ?? "https://www.bridgearg.net").replace(/\/$/, "");

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${clientUrl}/admin`,
  });

  if (inviteError) {
    const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) {
      return json(req, 400, { error: inviteError.message || "No se pudo invitar" });
    }
    const existing = (listed?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!existing) {
      return json(req, 400, { error: inviteError.message || "No se pudo invitar" });
    }

    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("user_id,is_owner")
      .eq("user_id", existing.id)
      .maybeSingle();
    if (existingAdmin) {
      return json(req, 200, { ok: true, already_member: true, user_id: existing.id, email });
    }

    const { error: insErr } = await supabase.from("admin_users").insert({
      user_id: existing.id,
      email,
      is_owner: false,
    });
    if (insErr) return json(req, 500, { error: insErr.message });

    const { error: permErr } = await supabase.from("admin_permissions").insert(
      INVITE_DEFAULT_SECTIONS.map((s) => ({ user_id: existing.id, ...s })),
    );
    if (permErr) return json(req, 500, { error: permErr.message });

    return json(req, 200, {
      ok: true,
      already_existed: true,
      invited: false,
      user_id: existing.id,
      email,
    });
  }

  const userId = invited?.user?.id;
  if (!userId) {
    return json(req, 500, { error: "Invite succeeded but user id missing" });
  }

  const { error: insErr } = await supabase.from("admin_users").insert({
    user_id: userId,
    email,
    is_owner: false,
  });
  if (insErr) {
    return json(req, 500, { error: insErr.message });
  }

  const { error: permErr } = await supabase.from("admin_permissions").insert(
    INVITE_DEFAULT_SECTIONS.map((s) => ({ user_id: userId, ...s })),
  );
  if (permErr) {
    return json(req, 500, { error: permErr.message });
  }

  return json(req, 200, { ok: true, invited: true, user_id: userId, email });
});

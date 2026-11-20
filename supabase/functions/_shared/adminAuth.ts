// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AdminSection =
  | "resumen"
  | "obras"
  | "artistas"
  | "lotes"
  | "pedidos"
  | "mensajes"
  | "suscriptores"
  | "trade"
  | "papelera"
  | "equipo";

export type AdminMode = "view" | "edit";

export type AdminAuthResult = {
  user: { id: string; email: string };
  isOwner: boolean;
  supabase: ReturnType<typeof createClient>;
};

function parseAdminEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Map admin-write / trade-admin actions → section + mode. */
export function actionPermission(action: string): { section: AdminSection; mode: AdminMode } | null {
  switch (action) {
    case "artwork.create":
    case "artwork.update":
    case "artwork.delete":
    case "artwork.assignLote":
      return { section: "obras", mode: "edit" };
    case "artwork.restore":
    case "artwork.hardDelete":
      return { section: "papelera", mode: "edit" };
    case "lote.create":
    case "lote.update":
    case "lote.delete":
      return { section: "lotes", mode: "edit" };
    case "lote.restore":
    case "lote.hardDelete":
      return { section: "papelera", mode: "edit" };
    case "artist.create":
    case "artist.update":
    case "artist.delete":
      return { section: "artistas", mode: "edit" };
    case "message.markThreadRead":
      // Opening a thread to mark it read is not a content edit.
      return { section: "mensajes", mode: "view" };
    case "message.updateStatus":
    case "message.delete":
    case "message.deleteThread":
    case "message.reply":
      return { section: "mensajes", mode: "edit" };
    case "message.restoreThread":
      return { section: "papelera", mode: "edit" };
    case "push.subscribe":
    case "push.unsubscribe":
      // Any admin with at least one view permission (checked via requiredAny in admin-write).
      return { section: "resumen", mode: "view" };
    case "subscriber.delete":
      return { section: "suscriptores", mode: "edit" };
    case "purchase.updateShipping":
      return { section: "pedidos", mode: "edit" };
    case "storage.signUpload":
      // Used by obras + artistas upload flows.
      return { section: "obras", mode: "edit" };
    // trade-admin
    case "list":
      return { section: "trade", mode: "view" };
    case "approve":
    case "reject":
    case "reopen":
    case "delete":
    case "deactivate":
    case "create":
    case "resend_email":
      return { section: "trade", mode: "edit" };
    default:
      return null;
  }
}

/**
 * Resolve JWT user, then authorize:
 * 1) admin_users.is_owner → allow
 * 2) admin_can_user(section, mode) when requiredPermission provided → allow
 * 3) ADMIN_EMAILS allowlist fallback → allow
 */
export async function authorizeAdminRequest(
  req: Request,
  opts: {
    requiredPermission?: { section: AdminSection; mode: AdminMode } | null;
    /** Pass if any of these permissions is enough (e.g. storage upload). */
    requiredAny?: Array<{ section: AdminSection; mode: AdminMode }>;
    /** If true, only owners pass (invite / equipo). ADMIN_EMAILS still fallback. */
    ownerOnly?: boolean;
  } = {},
): Promise<{ ok: true; auth: AdminAuthResult } | { ok: false; status: number; error: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS") ?? "";

  if (!supabaseUrl || !supabaseServiceRole || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Server configuration error" };
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const email = authData.user.email?.trim().toLowerCase() ?? "";
  const userId = authData.user.id;
  if (!email || !userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("is_owner")
    .eq("user_id", userId)
    .maybeSingle();

  const isOwner = Boolean(adminRow?.is_owner);
  if (isOwner) {
    return {
      ok: true,
      auth: { user: { id: userId, email }, isOwner: true, supabase },
    };
  }

  if (opts.ownerOnly) {
    // Fall through to ADMIN_EMAILS emergency bypass for owner-only ops? User said owner only for invite.
    // Keep ADMIN_EMAILS as emergency for owner-only too so you aren't locked out if seed fails.
    const allowlist = parseAdminEmails(adminEmailsRaw);
    if (allowlist.has(email)) {
      return {
        ok: true,
        auth: { user: { id: userId, email }, isOwner: false, supabase },
      };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const checks = [
    ...(opts.requiredPermission ? [opts.requiredPermission] : []),
    ...(opts.requiredAny ?? []),
  ];
  for (const required of checks) {
    const { data: can, error: canErr } = await supabase.rpc("admin_can_user", {
      p_user_id: userId,
      p_section: required.section,
      p_mode: required.mode,
    });
    if (!canErr && can === true) {
      return {
        ok: true,
        auth: { user: { id: userId, email }, isOwner: false, supabase },
      };
    }
  }

  // Emergency fallback
  const allowlist = parseAdminEmails(adminEmailsRaw);
  if (allowlist.has(email)) {
    return {
      ok: true,
      auth: { user: { id: userId, email }, isOwner: false, supabase },
    };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export type InvitePresetId = "vendedor" | "community" | "catalogo";

type SectionFlags = { section: AdminSection; can_view: boolean; can_edit: boolean };

function allSections(overrides: Partial<Record<AdminSection, { can_view: boolean; can_edit: boolean }>>): SectionFlags[] {
  const zeros: AdminSection[] = [
    "resumen",
    "obras",
    "artistas",
    "lotes",
    "pedidos",
    "mensajes",
    "suscriptores",
    "trade",
    "papelera",
    "equipo",
  ];
  return zeros.map((section) => ({
    section,
    can_view: overrides[section]?.can_view ?? false,
    can_edit: overrides[section]?.can_edit ?? false,
  }));
}

/** Invite presets — starting point; owner can tweak in Equipo grid after. */
export const INVITE_PRESETS: Record<InvitePresetId, SectionFlags[]> = {
  /** View+edit Resumen/Obras/Pedidos; view Mensajes. */
  vendedor: allSections({
    resumen: { can_view: true, can_edit: true },
    obras: { can_view: true, can_edit: true },
    pedidos: { can_view: true, can_edit: true },
    mensajes: { can_view: true, can_edit: false },
  }),
  /** View+edit Mensajes/Suscriptores; view Resumen. */
  community: allSections({
    resumen: { can_view: true, can_edit: false },
    mensajes: { can_view: true, can_edit: true },
    suscriptores: { can_view: true, can_edit: true },
  }),
  /** View-only Resumen/Obras/Artistas/Lotes (legacy default). */
  catalogo: allSections({
    resumen: { can_view: true, can_edit: false },
    obras: { can_view: true, can_edit: false },
    artistas: { can_view: true, can_edit: false },
    lotes: { can_view: true, can_edit: false },
  }),
};

/** @deprecated use INVITE_PRESETS.catalogo — kept for revokeAccess row template */
export const INVITE_DEFAULT_SECTIONS = INVITE_PRESETS.catalogo;

export function resolveInvitePreset(raw: unknown): InvitePresetId {
  if (raw === "vendedor" || raw === "community" || raw === "catalogo") return raw;
  return "catalogo";
}

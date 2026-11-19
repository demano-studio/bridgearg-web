// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { actionPermission, authorizeAdminRequest } from "../_shared/adminAuth.ts";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).origin;
  } catch (_e) {
    return null;
  }
}

/** Dev: any localhost / 127.0.0.1 port. Prod hosts come from CLIENT_URL + CORS_ORIGIN. */
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
  // Reflect exact Origin when allowed. Never return a different origin (breaks preflight).
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
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

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { action, payload } = body;
  if (typeof action !== "string" || !action.trim() || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const perm =
    action === "storage.signUpload"
      ? null
      : actionPermission(action);

  const authResult = await authorizeAdminRequest(req, {
    requiredPermission: perm,
    requiredAny:
      action === "storage.signUpload"
        ? [
            { section: "obras", mode: "edit" },
            { section: "artistas", mode: "edit" },
          ]
        : undefined,
  });
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { supabase, user } = authResult.auth;
  const email = user.email;

  try {
    let result: unknown;

    if (action === "artwork.create") {
      const { data, error } = await supabase.from("artworks").insert(payload).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artwork.update") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { id: _id, ...updates } = payload as Record<string, unknown>;

      let previousStatus: string | null = null;
      const nextStatus = typeof updates.status === "string" ? updates.status : null;
      if (nextStatus) {
        const { data: currentRow, error: currentErr } = await supabase
          .from("artworks")
          .select("status")
          .eq("id", id)
          .single();
        if (currentErr) throw new Error(currentErr.message ?? "Operation failed");
        previousStatus = (currentRow?.status as string | null | undefined) ?? null;
      }

      const { data, error } = await supabase.from("artworks").update(updates).eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");

      if (nextStatus && previousStatus != null && previousStatus !== nextStatus) {
        const { error: historyErr } = await supabase.from("artwork_status_history").insert({
          artwork_id: id,
          from_status: previousStatus,
          to_status: nextStatus,
          changed_by_email: email,
        });
        if (historyErr) throw new Error(historyErr.message ?? "Failed to record status history");
      }

      result = data;
    } else if (action === "artwork.delete") {
      // Soft-delete → Papelera
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase
        .from("artworks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artwork.restore") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase
        .from("artworks")
        .update({ deleted_at: null })
        .eq("id", id)
        .not("deleted_at", "is", null)
        .select("*")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artwork.hardDelete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const [{ count: purchaseCount, error: purchaseErr }, { count: verifCount, error: verifErr }] =
        await Promise.all([
          supabase.from("purchases").select("id", { count: "exact", head: true }).eq("artwork_id", id),
          supabase
            .from("purchase_verifications")
            .select("id", { count: "exact", head: true })
            .eq("artwork_id", id),
        ]);
      if (purchaseErr) throw new Error(purchaseErr.message ?? "Operation failed");
      if (verifErr) throw new Error(verifErr.message ?? "Operation failed");
      if ((purchaseCount ?? 0) > 0 || (verifCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            error:
              "No se puede eliminar definitivamente: hay compras o verificaciones asociadas a esta obra. Dejala en la Papelera.",
          }),
          { status: 409, headers: withCors(req, { "Content-Type": "application/json" }) },
        );
      }
      // artwork_status_history cascades on FK
      const { data, error } = await supabase.from("artworks").delete().eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artwork.assignLote") {
      const loteIdRaw = (payload as { lote_id?: unknown }).lote_id;
      const loteId =
        loteIdRaw === null
          ? null
          : typeof loteIdRaw === "number" && loteIdRaw >= 1
            ? loteIdRaw
            : undefined;
      if (loteId === undefined) {
        return new Response(JSON.stringify({ error: "payload.lote_id required (number >= 1 or null)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const onlyUnassigned = (payload as { only_unassigned?: unknown }).only_unassigned === true;
      const idsRaw = (payload as { ids?: unknown }).ids;
      const ids = Array.isArray(idsRaw)
        ? idsRaw.filter((id): id is number => typeof id === "number" && id >= 1)
        : null;

      let query = supabase.from("artworks").update({ lote_id: loteId }).is("deleted_at", null).select("id");
      if (ids && ids.length > 0) {
        query = query.in("id", ids);
      } else if (onlyUnassigned) {
        query = query.is("lote_id", null);
      } else {
        return new Response(JSON.stringify({ error: "payload.ids or payload.only_unassigned required" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message ?? "Operation failed");
      result = { updated: (data ?? []).length, ids: (data ?? []).map((row: { id: number }) => row.id) };
    } else if (action === "lote.create") {
      const nombreRaw = (payload as { nombre?: unknown }).nombre;
      const nombre = typeof nombreRaw === "string" ? nombreRaw.trim() : "";
      if (!nombre) {
        return new Response(JSON.stringify({ error: "payload.nombre required (non-empty string)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const fechaRaw = (payload as { fecha?: unknown }).fecha;
      const fecha = typeof fechaRaw === "string" && fechaRaw.trim() ? fechaRaw.trim() : null;
      const insertRow: Record<string, unknown> = { nombre };
      if (fecha != null) insertRow.fecha = fecha;
      const { data, error } = await supabase.from("lotes").insert(insertRow).select("id,nombre,fecha,created_at").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "lote.update") {
      const id = (payload as { id?: unknown }).id;
      const nombreRaw = (payload as { nombre?: unknown }).nombre;
      const nombre = typeof nombreRaw === "string" ? nombreRaw.trim() : "";
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      if (!nombre) {
        return new Response(JSON.stringify({ error: "payload.nombre required (non-empty string)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const updates: Record<string, unknown> = { nombre };
      if ("fecha" in (payload as object)) {
        const fechaRaw = (payload as { fecha?: unknown }).fecha;
        updates.fecha =
          fechaRaw === null
            ? null
            : typeof fechaRaw === "string" && fechaRaw.trim()
              ? fechaRaw.trim()
              : null;
      }
      const { data, error } = await supabase
        .from("lotes")
        .update(updates)
        .eq("id", id)
        .select("id,nombre,fecha,created_at")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "lote.delete") {
      // Soft-delete → Papelera; unassign artworks like hard-delete used to
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data: cleared, error: clearError } = await supabase
        .from("artworks")
        .update({ lote_id: null })
        .eq("lote_id", id)
        .is("deleted_at", null)
        .select("id");
      if (clearError) throw new Error(clearError.message ?? "Operation failed");
      const { data, error } = await supabase
        .from("lotes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select("id,nombre,fecha,created_at,deleted_at")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = {
        deleted: data,
        artworks_unassigned: (cleared ?? []).length,
        artwork_ids: (cleared ?? []).map((row: { id: number }) => row.id),
      };
    } else if (action === "lote.restore") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase
        .from("lotes")
        .update({ deleted_at: null })
        .eq("id", id)
        .not("deleted_at", "is", null)
        .select("id,nombre,fecha,created_at,deleted_at")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "lote.hardDelete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data: cleared, error: clearError } = await supabase
        .from("artworks")
        .update({ lote_id: null })
        .eq("lote_id", id)
        .select("id");
      if (clearError) throw new Error(clearError.message ?? "Operation failed");
      const { data, error } = await supabase.from("lotes").delete().eq("id", id).select("id,nombre").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = {
        deleted: data,
        artworks_unassigned: (cleared ?? []).length,
        artwork_ids: (cleared ?? []).map((row: { id: number }) => row.id),
      };
    } else if (action === "artist.create") {
      const { data, error } = await supabase.from("artists").insert(payload).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artist.update") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { id: _id, ...updates } = payload as Record<string, unknown>;
      const { data, error } = await supabase.from("artists").update(updates).eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artist.delete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase.from("artists").delete().eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "message.delete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id)
        .select("id,full_name,email,subject")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "subscriber.delete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id)
        .select("id,email,source")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "message.updateStatus") {
      const id = (payload as { id?: unknown }).id;
      const status = (payload as { status?: unknown }).status;
      const allowed = new Set(["new", "read", "responded"]);
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      if (typeof status !== "string" || !allowed.has(status)) {
        return new Response(JSON.stringify({ error: "payload.status must be new|read|responded" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const updates: Record<string, unknown> = { status };
      if (status === "read") updates.read_at = new Date().toISOString();
      if (status === "responded") updates.responded_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("contact_messages")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "purchase.updateShipping") {
      const id = (payload as { id?: unknown }).id;
      const shippingStatus = (payload as { shipping_status?: unknown }).shipping_status;
      const allowed = new Set(["paid", "preparing", "shipped", "delivered"]);
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      if (typeof shippingStatus !== "string" || !allowed.has(shippingStatus)) {
        return new Response(
          JSON.stringify({ error: "payload.shipping_status must be paid|preparing|shipped|delivered" }),
          {
            status: 400,
            headers: withCors(req, { "Content-Type": "application/json" }),
          },
        );
      }
      const { data, error } = await supabase
        .from("purchases")
        .update({ shipping_status: shippingStatus })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "storage.signUpload") {
      const path = (payload as { path?: unknown }).path;
      const bucketRaw = (payload as { bucket?: unknown }).bucket;
      const bucket =
        bucketRaw === "artists" || bucketRaw === "artworks" ? bucketRaw : "artworks";
      if (typeof path !== "string" || !path.trim()) {
        return new Response(JSON.stringify({ error: "payload.path required (string)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path.trim());
      if (error) throw new Error(error.message ?? "Operation failed");
      result = { ...data, bucket, path: path.trim() };
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: withCors(req, { "Content-Type": "application/json" }),
      });
    }

    return new Response(JSON.stringify({ ok: true, data: result }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }
});

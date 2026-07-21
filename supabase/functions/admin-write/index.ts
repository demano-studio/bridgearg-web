// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

function parseAdminEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS");

  if (!supabaseUrl || !supabaseServiceRole || !supabaseAnonKey || !adminEmailsRaw) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const email = authData.user.email?.trim().toLowerCase() ?? "";
  const adminEmails = parseAdminEmails(adminEmailsRaw);
  if (!email || !adminEmails.has(email)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
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

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

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
      const { data, error } = await supabase.from("artworks").update(updates).eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
    } else if (action === "artwork.delete") {
      const id = (payload as { id?: unknown }).id;
      if (typeof id !== "number" || id < 1) {
        return new Response(JSON.stringify({ error: "payload.id required (number >= 1)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase.from("artworks").delete().eq("id", id).select("*").single();
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
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
    } else if (action === "storage.signUpload") {
      const path = (payload as { path?: unknown }).path;
      if (typeof path !== "string" || !path.trim()) {
        return new Response(JSON.stringify({ error: "payload.path required (string)" }), {
          status: 400,
          headers: withCors(req, { "Content-Type": "application/json" }),
        });
      }
      const { data, error } = await supabase.storage.from("artworks").createSignedUploadUrl(path.trim());
      if (error) throw new Error(error.message ?? "Operation failed");
      result = data;
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

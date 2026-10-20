// @ts-nocheck
// Supabase Edge Function: newsletter subscribe (honeypot + upsert).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL

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

  let body: { email?: unknown; source?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  // Honeypot: bots that fill "website" get a fake success without writing.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "A valid email is required" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const sourceRaw = typeof body.source === "string" ? body.source.trim().toLowerCase() : "";
  const sourceCleaned = sourceRaw.replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  const source = sourceCleaned || "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRole) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    { email, source },
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (error) {
    console.error("newsletter-subscribe upsert error:", error);
    return new Response(JSON.stringify({ error: "Could not subscribe" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
});

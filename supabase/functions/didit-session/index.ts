// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).origin;
  } catch (_e) {
    return null;
  }
}

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value.replace(/\/$/, "")).toString().replace(/\/$/, "");
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

  let body: { artworkId?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { artworkId } = body;
  if (typeof artworkId !== "number" || artworkId < 1) {
    return new Response(JSON.stringify({ error: "artworkId required (number >= 1)" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const diditApiKey = Deno.env.get("DIDIT_API_KEY");
  const diditWorkflowId = Deno.env.get("DIDIT_WORKFLOW_ID");
  const clientUrlRaw = Deno.env.get("CLIENT_URL");

  if (!supabaseUrl || !supabaseServiceRole || !diditApiKey || !diditWorkflowId || !clientUrlRaw) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const clientUrl = normalizeUrl(clientUrlRaw.trim());
  if (!clientUrl) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { data: artwork, error: artworkError } = await supabase
    .from("artworks")
    .select("id, status")
    .eq("id", artworkId)
    .single();

  if (artworkError || !artwork) {
    return new Response(JSON.stringify({ error: "Artwork not found" }), {
      status: 404,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if ((artwork as { status?: string }).status !== "available") {
    return new Response(JSON.stringify({ error: "Artwork is not available for purchase" }), {
      status: 400,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { data: verification, error: insertError } = await supabase
    .from("purchase_verifications")
    .insert({ artwork_id: artworkId, status: "pending" })
    .select("id")
    .single();

  if (insertError || !verification?.id) {
    return new Response(JSON.stringify({ error: "Failed to create verification record" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const verificationId = String(verification.id);
  const callback = `${clientUrl.replace(/\/$/, "")}/verify/callback`;

  let diditResponse: Response;
  try {
    diditResponse = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "x-api-key": diditApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: diditWorkflowId,
        vendor_data: verificationId,
        callback,
      }),
    });
  } catch (err) {
    console.error("didit-session network error:", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Didit session request failed" }), {
      status: 502,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  let diditData: Record<string, unknown> | null = null;
  try {
    diditData = await diditResponse.json();
  } catch {
    diditData = null;
  }

  const sessionUrl = typeof diditData?.session_url === "string"
    ? diditData.session_url
    : typeof diditData?.url === "string"
      ? diditData.url
      : null;
  const sessionId = typeof diditData?.session_id === "string" ? diditData.session_id : null;

  if (!diditResponse.ok) {
    return new Response(JSON.stringify({ error: "Didit session creation failed" }), {
      status: 502,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (!sessionUrl) {
    return new Response(JSON.stringify({ error: "Didit session created without URL" }), {
      status: 502,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Didit session response missing session_id" }), {
      status: 502,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  const { error: updateError } = await supabase
    .from("purchase_verifications")
    .update({ didit_session_id: sessionId })
    .eq("id", verificationId);

  if (updateError) {
    return new Response(JSON.stringify({ error: "Failed to update verification session" }), {
      status: 500,
      headers: withCors(req, { "Content-Type": "application/json" }),
    });
  }

  return new Response(JSON.stringify({ url: sessionUrl, verificationId }), {
    status: 200,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
});

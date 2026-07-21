// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type DiditMappedStatus = "approved" | "declined" | "in_review" | "abandoned";

const MAX_TIMESTAMP_DRIFT_SECONDS = 300;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeDiditStatus(value: unknown): DiditMappedStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  switch (normalized) {
    case "approved":
      return "approved";
    case "declined":
      return "declined";
    case "in review":
      return "in_review";
    case "abandoned":
      return "abandoned";
    default:
      return null;
  }
}

function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = shortenFloats(value);
    }
    return result;
  }
  if (typeof data === "number" && Number.isFinite(data) && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

function sortKeysDeep(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(sortKeysDeep);
  if (data && typeof data === "object") {
    const input = data as Record<string, unknown>;
    const sortedKeys = Object.keys(input).sort((a, b) => a.localeCompare(b));
    const output: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      output[key] = sortKeysDeep(input[key]);
    }
    return output;
  }
  return data;
}

function toCanonicalDiditV2Json(parsedBody: unknown): string {
  return JSON.stringify(sortKeysDeep(shortenFloats(parsedBody)));
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(aHex.toLowerCase());
  const b = encoder.encode(bHex.toLowerCase());
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractApprovedIdentity(decision: unknown): {
  buyer_full_name: string | null;
  buyer_country: string | null;
  buyer_document_type: string | null;
} {
  if (!decision || typeof decision !== "object") {
    return {
      buyer_full_name: null,
      buyer_country: null,
      buyer_document_type: null,
    };
  }

  const decisionObj = decision as Record<string, unknown>;
  const idVerificationsRaw = decisionObj.id_verifications;
  const idVerifications = Array.isArray(idVerificationsRaw) ? idVerificationsRaw : [];

  const firstDoc = idVerifications.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  if (!firstDoc) {
    return {
      buyer_full_name: null,
      buyer_country: null,
      buyer_document_type: null,
    };
  }

  const firstName = typeof firstDoc.first_name === "string" ? firstDoc.first_name.trim() : "";
  const lastName = typeof firstDoc.last_name === "string" ? firstDoc.last_name.trim() : "";
  const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fullNameFallback = typeof firstDoc.full_name === "string" ? firstDoc.full_name.trim() : "";

  const buyer_full_name = fullNameFromParts || fullNameFallback || null;
  const issuingState = typeof firstDoc.issuing_state === "string" ? firstDoc.issuing_state.trim() : "";
  const nationality = typeof firstDoc.nationality === "string" ? firstDoc.nationality.trim() : "";
  const buyer_country = issuingState || nationality || null;
  const buyer_document_type =
    typeof firstDoc.document_type === "string" && firstDoc.document_type.trim()
      ? firstDoc.document_type.trim()
      : null;

  return { buyer_full_name, buyer_country, buyer_document_type };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const webhookSecret = Deno.env.get("DIDIT_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Server configuration error" });
  }

  const rawBody = await req.text();

  const timestampHeader = req.headers.get("X-Timestamp") ?? req.headers.get("x-timestamp");
  if (!timestampHeader) {
    return jsonResponse(401, { error: "Invalid signature" });
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) {
    return jsonResponse(401, { error: "Invalid signature" });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_DRIFT_SECONDS) {
    return jsonResponse(401, { error: "Invalid signature" });
  }

  const signatureV2 = req.headers.get("X-Signature-V2") ?? req.headers.get("x-signature-v2");
  const signatureLegacy = req.headers.get("X-Signature") ?? req.headers.get("x-signature");

  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  let signatureValid = false;

  if (signatureV2) {
    const canonical = toCanonicalDiditV2Json(parsedPayload);
    const expectedV2 = await hmacSha256Hex(webhookSecret, canonical);
    signatureValid = timingSafeEqualHex(expectedV2, signatureV2);
  }

  if (!signatureValid && signatureLegacy) {
    const expectedLegacy = await hmacSha256Hex(webhookSecret, rawBody);
    signatureValid = timingSafeEqualHex(expectedLegacy, signatureLegacy);
  }

  if (!signatureValid) {
    return jsonResponse(401, { error: "Invalid signature" });
  }

  const sessionId = typeof parsedPayload.session_id === "string" ? parsedPayload.session_id : null;
  const vendorData = typeof parsedPayload.vendor_data === "string" ? parsedPayload.vendor_data : null;
  const decision = (parsedPayload.decision ?? null) as Record<string, unknown> | null;
  const mappedStatus = normalizeDiditStatus(parsedPayload.status);

  if (!mappedStatus) {
    // Estados intermedios (Not Started, In Progress…): no nos interesan. Ack y listo.
    return jsonResponse(200, { ok: true, ignored: true });
  }

  const updateData: Record<string, unknown> = {
    status: mappedStatus,
    decision,
  };

  if (mappedStatus === "approved") {
    const approvedData = extractApprovedIdentity(decision);
    updateData.buyer_full_name = approvedData.buyer_full_name;
    updateData.buyer_country = approvedData.buyer_country;
    updateData.buyer_document_type = approvedData.buyer_document_type;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let updated = false;
  let updateError: unknown = null;

  if (vendorData) {
    const result = await supabase
      .from("purchase_verifications")
      .update(updateData)
      .eq("id", vendorData)
      .select("id");

    updateError = result.error;
    updated = Array.isArray(result.data) && result.data.length > 0;
  }

  if (!updated && sessionId) {
    const fallbackResult = await supabase
      .from("purchase_verifications")
      .update(updateData)
      .eq("didit_session_id", sessionId)
      .select("id");

    updateError = fallbackResult.error;
    updated = Array.isArray(fallbackResult.data) && fallbackResult.data.length > 0;
  }

  if (updateError) {
    console.error("didit-webhook update failed:", updateError);
    return jsonResponse(500, { error: "Internal server error" });
  }

  if (!updated) {
    // Sin fila para este vendor_data/session_id (ej.: webhook de prueba del console).
    // Ack para que Didit no reintente; no es un error del servidor.
    console.warn("didit-webhook: no matching verification record", { vendorData, sessionId });
    return jsonResponse(200, { ok: true, matched: false });
  }

  return jsonResponse(200, { ok: true });
});

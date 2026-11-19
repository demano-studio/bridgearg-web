// @ts-nocheck
/**
 * Best-effort admin alerts: Telegram + Web Push in parallel.
 * Never throws — primary business flows must not fail because of notifications.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { escapeHtml, notifyTelegram } from "./telegram.ts";

export type NotifySection =
  | "pedidos"
  | "mensajes"
  | "suscriptores"
  | "trade"
  | "resumen"
  | "obras"
  | "artistas"
  | "lotes"
  | "papelera"
  | "equipo";

export type NotifyPayload = {
  /** Plain-text Telegram body (already escaped HTML if needed). */
  telegramHtml: string;
  title: string;
  body: string;
  /** Deep link under /admin/... */
  url: string;
};

type SubRow = {
  id: number;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let cachedAppServer: Awaited<ReturnType<typeof webpush.ApplicationServer.new>> | null = null;

async function getAppServer() {
  if (cachedAppServer) return cachedAppServer;

  const subject = (Deno.env.get("VAPID_SUBJECT") ?? "").trim();
  const keysRaw = (Deno.env.get("VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID_KEYS_JSON") ?? "").trim();
  if (!subject || !keysRaw) {
    console.error("notifyAdmins: VAPID_SUBJECT / VAPID_PRIVATE_KEY missing; skip push");
    return null;
  }

  let exported: { publicKey: JsonWebKey; privateKey: JsonWebKey };
  try {
    exported = JSON.parse(keysRaw);
  } catch (e) {
    console.error("notifyAdmins: VAPID_PRIVATE_KEY is not valid JSON", e);
    return null;
  }

  try {
    const vapidKeys = await webpush.importVapidKeys(exported, { extractable: false });
    cachedAppServer = await webpush.ApplicationServer.new({
      contactInformation: subject.startsWith("mailto:") ? subject : `mailto:${subject}`,
      vapidKeys,
    });
    return cachedAppServer;
  } catch (e) {
    console.error("notifyAdmins: failed to init ApplicationServer", e);
    return null;
  }
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

async function userCanView(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  section: NotifySection,
): Promise<boolean> {
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("is_owner")
    .eq("user_id", userId)
    .maybeSingle();
  if (adminRow?.is_owner) return true;

  const { data: can, error } = await supabase.rpc("admin_can_user", {
    p_user_id: userId,
    p_section: section,
    p_mode: "view",
  });
  if (error) {
    console.error("notifyAdmins: admin_can_user error", error.message);
    return false;
  }
  return can === true;
}

async function sendPushToSubs(
  supabase: ReturnType<typeof createClient>,
  section: NotifySection,
  payload: NotifyPayload,
): Promise<void> {
  const appServer = await getAppServer();
  if (!appServer) return;

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");
  if (error) {
    console.error("notifyAdmins: list subscriptions failed", error.message);
    return;
  }
  if (!subs?.length) return;

  const byUser = new Map<string, SubRow[]>();
  for (const row of subs as SubRow[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  });

  for (const [userId, userSubs] of byUser) {
    const allowed = await userCanView(supabase, userId, section);
    if (!allowed) continue;

    for (const sub of userSubs) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        });
        await subscriber.pushTextMessage(message, {});
      } catch (e) {
        const status =
          typeof e === "object" && e && "statusCode" in e
            ? Number((e as { statusCode: number }).statusCode)
            : typeof e === "object" && e && "status" in e
              ? Number((e as { status: number }).status)
              : null;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("notifyAdmins: push failed", sub.id, status, msg.slice(0, 300));
        // Gone / Not Found → drop stale subscription
        if (status === 404 || status === 410 || /404|410|gone|unsubscribed|not\s*found/i.test(msg)) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }
}

/**
 * Fire Telegram + Web Push together. Safe to await; never throws.
 */
export async function notifyAdmins(section: NotifySection, payload: NotifyPayload): Promise<void> {
  const telegramPromise = notifyTelegram(payload.telegramHtml).catch((e) => {
    console.error("notifyAdmins: telegram unexpected", e);
  });

  const pushPromise = (async () => {
    const supabase = serviceClient();
    if (!supabase) {
      console.error("notifyAdmins: missing SUPABASE_URL / SERVICE_ROLE; skip push");
      return;
    }
    await sendPushToSubs(supabase, section, payload);
  })().catch((e) => {
    console.error("notifyAdmins: push unexpected", e);
  });

  await Promise.all([telegramPromise, pushPromise]);
}

export { escapeHtml };

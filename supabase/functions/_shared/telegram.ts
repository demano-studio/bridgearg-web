/** Best-effort Telegram notify for Edge Functions (Deno). Never throws. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * POST sendMessage. Missing secrets or API errors are logged and ignored
 * so the primary business flow never fails because of Telegram.
 */
export async function notifyTelegram(mensaje: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();

  if (!token || !chatId) {
    console.error("notifyTelegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing; skip");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensaje,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("notifyTelegram: Telegram API error", res.status, body.slice(0, 500));
      return;
    }
  } catch (e) {
    console.error("notifyTelegram: fetch failed", e);
  }
}

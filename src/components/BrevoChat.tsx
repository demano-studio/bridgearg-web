import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BREVO_ID = "6aabd39dc166dd31910008ab";
const SRC = "https://conversations-widget.brevo.com/brevo-conversations.js";
const EXCLUDED = ["/admin", "/checkout", "/verify"];

declare global {
  interface Window {
    BrevoConversationsID?: string;
    BrevoConversations?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

let brevoLoadScheduled = false;

function loadBrevoScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${SRC}"]`)) return;

  window.BrevoConversationsID = BREVO_ID;
  // Misma cola que el snippet oficial de Brevo (push(arguments)).
  window.BrevoConversations =
    window.BrevoConversations ||
    (function (this: void) {
      // eslint-disable-next-line prefer-rest-params
      (window.BrevoConversations!.q = window.BrevoConversations!.q || []).push(arguments);
    } as Window["BrevoConversations"]);

  const s = document.createElement("script");
  s.async = true;
  s.src = SRC;
  document.head.appendChild(s);
}

function scheduleBrevoLoad() {
  if (brevoLoadScheduled) return;
  brevoLoadScheduled = true;

  const run = () => {
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      idle(() => loadBrevoScript(), { timeout: 4000 });
    } else {
      window.setTimeout(loadBrevoScript, 2000);
    }
  };

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run, { once: true });
  }
}

export function BrevoChat() {
  const { pathname } = useLocation();
  const excluded = EXCLUDED.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (excluded) return;
    scheduleBrevoLoad();
  }, [excluded]);

  return null;
}

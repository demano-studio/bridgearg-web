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

let pendingIdleId: number | null = null;
let pendingTimeoutId: number | null = null;
let loadListenerAttached = false;

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function cancelPendingLoad() {
  if (pendingIdleId != null && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(pendingIdleId);
  }
  pendingIdleId = null;
  if (pendingTimeoutId != null) {
    window.clearTimeout(pendingTimeoutId);
  }
  pendingTimeoutId = null;
}

function ensureBrevoStub() {
  window.BrevoConversationsID = BREVO_ID;
  // Official queue stub (push arguments) until the real script replaces it.
  if (typeof window.BrevoConversations !== "function") {
    window.BrevoConversations = function (this: void) {
      // eslint-disable-next-line prefer-rest-params
      (window.BrevoConversations!.q = window.BrevoConversations!.q || []).push(arguments);
    } as Window["BrevoConversations"];
  }
}

function callBrevo(method: string, ...args: unknown[]) {
  try {
    if (typeof window.BrevoConversations === "function") {
      window.BrevoConversations(method, ...args);
    }
  } catch {
    // Widget may not be ready / already killed.
  }
}

function hideBrevoOnExcludedRoute() {
  cancelPendingLoad();
  callBrevo("hide");
  callBrevo("kill", true);

  // Belt-and-suspenders: remove leftover DOM if kill didn't.
  document.getElementById("brevo-conversations-widget")?.remove();
  document.querySelectorAll<HTMLElement>("[id*='brevo-conversations'], [class*='brevo-conversations']").forEach((el) => {
    if (el.tagName === "SCRIPT") return;
    el.style.setProperty("display", "none", "important");
  });
}

function injectBrevoScript() {
  if (typeof document === "undefined") return;
  if (isExcludedPath(window.location.pathname)) return;

  ensureBrevoStub();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
  if (existing) {
    // Script already present (e.g. after SPA navigation back from /admin).
    callBrevo("restart");
    callBrevo("show");
    return;
  }

  const s = document.createElement("script");
  s.async = true;
  s.src = SRC;
  document.head.appendChild(s);
}

function scheduleBrevoLoad() {
  cancelPendingLoad();
  if (isExcludedPath(window.location.pathname)) return;

  const run = () => {
    pendingIdleId = null;
    pendingTimeoutId = null;
    if (isExcludedPath(window.location.pathname)) return;
    injectBrevoScript();
  };

  const start = () => {
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      pendingIdleId = idle(() => run(), { timeout: 4000 });
    } else {
      pendingTimeoutId = window.setTimeout(run, 2000);
    }
  };

  if (document.readyState === "complete") {
    start();
  } else if (!loadListenerAttached) {
    loadListenerAttached = true;
    window.addEventListener(
      "load",
      () => {
        loadListenerAttached = false;
        if (isExcludedPath(window.location.pathname)) return;
        start();
      },
      { once: true },
    );
  }
}

export function BrevoChat() {
  const { pathname } = useLocation();
  const excluded = isExcludedPath(pathname);

  useEffect(() => {
    if (excluded) {
      hideBrevoOnExcludedRoute();
      return;
    }
    scheduleBrevoLoad();
  }, [excluded, pathname]);

  return null;
}

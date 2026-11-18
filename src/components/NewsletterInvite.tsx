import { useState } from "react";
import { X } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";

const STORAGE_KEY = "bridgearg_newsletter";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

type Stored =
  | { state: "subscribed" }
  | { state: "dismissed"; at: number };

function readShouldShow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.state === "subscribed") return false;
    if (parsed?.state === "dismissed" && typeof parsed.at === "number") {
      return Date.now() - parsed.at >= DISMISS_MS;
    }
    return true;
  } catch {
    return true;
  }
}

function writeStorage(value: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function NewsletterInvite() {
  const [visible, setVisible] = useState(() => readShouldShow());

  if (!visible) return null;

  const dismiss = () => {
    writeStorage({ state: "dismissed", at: Date.now() });
    setVisible(false);
  };

  const onSuccess = () => {
    writeStorage({ state: "subscribed" });
    window.setTimeout(() => setVisible(false), 1800);
  };

  return (
    <aside className="collection-newsletter" aria-label="Newsletter">
      <button
        type="button"
        data-no-pill
        onClick={dismiss}
        aria-label="Dismiss"
        className="collection-newsletter__dismiss icon-btn"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="collection-newsletter__grid">
        <div>
          <h2 className="collection-newsletter__title">New works, first.</h2>
          <p className="collection-newsletter__copy">
            Leave your email and we'll let you know when new works arrive.
          </p>
        </div>
        <NewsletterForm source="collection" variant="banner" onSuccess={onSuccess} />
      </div>
    </aside>
  );
}

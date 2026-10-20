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
    <aside
      className="relative border-y border-[rgba(30,21,23,0.12)] bg-[#fcf8ea]"
      style={{
        padding: "28px clamp(24px, 7vw, 120px)",
        minHeight: "140px",
      }}
      aria-label="Newsletter"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center text-[#1e1517]/55 transition-colors hover:text-[#1e1517] md:right-8"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="grid max-w-3xl gap-4 pr-10 md:grid-cols-[1fr_1.2fr] md:items-end md:gap-10">
        <div>
          <h2
            className="font-display text-2xl font-semibold tracking-tight text-[#1e1517] md:text-3xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            New works, first.
          </h2>
          <p className="mt-2 font-display text-sm leading-relaxed text-[rgba(30,21,23,0.65)]">
            Leave your email and we'll let you know when new works arrive.
          </p>
        </div>
        <NewsletterForm source="collection" variant="banner" onSuccess={onSuccess} />
      </div>
    </aside>
  );
}

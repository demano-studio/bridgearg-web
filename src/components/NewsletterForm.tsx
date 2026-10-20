import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/lib/api";

type NewsletterFormProps = {
  source: string;
  variant?: "footer" | "banner";
  onSuccess?: () => void;
};

export function NewsletterForm({
  source,
  variant = "footer",
  onSuccess,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const isFooter = variant === "footer";
  const buttonLabel = isFooter ? "Subscribe" : "Notify me";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setError("Please enter a valid email");
      return;
    }

    setStatus("loading");
    setError("");
    const result = await subscribeNewsletter(trimmed, source, website);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("success");
    setEmail("");
    onSuccess?.();
  };

  if (status === "success") {
    return (
      <p
        className={`font-display text-xs ${
          isFooter ? "text-[#fcf8ea]/80" : "text-foreground"
        }`}
      >
        Thank you. You're on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex gap-2 ${isFooter ? "" : "flex-col sm:flex-row"}`}>
        <label htmlFor={`newsletter-email-${source}`} className="sr-only">
          Email address
        </label>
        {/* Honeypot: visible to bots, off-screen for humans (no display:none). */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            top: "auto",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        />
        <Input
          id={`newsletter-email-${source}`}
          type="email"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className={
            isFooter
              ? "h-auto flex-1 rounded-none border-[#fcf8ea]/20 bg-transparent px-3 py-2 font-display text-xs text-[#fcf8ea] placeholder:text-[#fcf8ea]/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#fcf8ea]/50"
              : "h-auto flex-1 rounded-none border-[rgba(30,21,23,0.2)] bg-[#fcf8ea] px-3 py-2.5 font-display text-sm text-[#1e1517] placeholder:text-[rgba(30,21,23,0.4)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#7FB2D1]"
          }
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className={
            isFooter
              ? "h-auto rounded-none border border-[#fcf8ea]/20 bg-transparent px-4 py-2 font-display text-xs uppercase tracking-[0.12em] text-[#fcf8ea] hover:bg-[#fcf8ea]/10"
              : "h-auto rounded-none border border-[#7FB2D1] bg-[#7FB2D1] px-5 py-2.5 font-display text-xs uppercase tracking-[0.12em] text-[#1e1517] hover:bg-[#7FB2D1]/85"
          }
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {isFooter ? "Subscribing..." : "Sending..."}
            </span>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
      {status === "error" && error ? (
        <p role="alert" className={`mt-2 font-display text-xs ${isFooter ? "text-[#f5c6c6]" : "text-destructive"}`}>
          {error}
        </p>
      ) : null}
      <p
        className={`mt-3 font-display text-[10px] leading-relaxed ${
          isFooter ? "text-[#fcf8ea]/45" : "text-[rgba(30,21,23,0.55)]"
        }`}
      >
        By subscribing you agree to receive occasional emails from BridgeARG about new works and
        exhibitions. You can unsubscribe at any time.
      </p>
    </form>
  );
}

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
      <p className={isFooter ? "site-footer-form__success" : "collection-newsletter__success"}>
        Thank you. You're on the list.
      </p>
    );
  }

  const honeypot = (
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
  );

  if (!isFooter) {
    return (
      <form onSubmit={handleSubmit} className="collection-newsletter form">
        <label htmlFor={`newsletter-email-${source}`} className="collection-newsletter__label">
          Email address
        </label>
        {honeypot}
        <div className="collection-newsletter__row">
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
            className="collection-newsletter__input focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="collection-newsletter__submit hover:bg-transparent hover:text-[#1e1517]"
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending...
              </span>
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
        {status === "error" && error ? (
          <p role="alert" className="collection-newsletter__error">
            {error}
          </p>
        ) : null}
        <p className="collection-newsletter__legal">
          By subscribing you agree to receive occasional emails from BridgeARG about new works and
          exhibitions. You can unsubscribe at any time.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="site-footer-form">
      <label htmlFor={`newsletter-email-${source}`} className="site-footer-form__label">
        Email address
      </label>
      {honeypot}
      <div className="site-footer-form__row">
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
          className="site-footer-form__input focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="site-footer-form__submit"
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Subscribing...
            </span>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
      {status === "error" && error ? (
        <p role="alert" className="site-footer-form__error">
          {error}
        </p>
      ) : null}
      <p className="site-footer-form__legal">
        By subscribing you agree to receive occasional emails from BridgeARG about new works and
        exhibitions. You can unsubscribe at any time.
      </p>
    </form>
  );
}

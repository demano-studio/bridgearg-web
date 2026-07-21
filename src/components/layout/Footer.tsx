import { Loader2, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const logoSrc = encodeURI("/assets/logos/BRIDGEARG - Exportacion logos-05.svg");

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  // TODO: Conectar con servicio de email real
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus("loading");
    // TODO: Conectar con endpoint real de newsletter (ej: Resend, Mailchimp, Supabase)
    await new Promise((r) => setTimeout(r, 800));
    setNewsletterStatus("success");
    setNewsletterEmail("");
  };

  return (
    <footer className="bg-[#1e1517] text-[#fcf8ea]">
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-10 md:px-10 md:pb-14">
        {/* Top: logo */}
        <div className="mb-12 border-b border-[#fcf8ea]/10 pb-10">
          <Link to="/">
            <img
              src={logoSrc}
              alt="BridgeArg"
              className="h-auto w-auto"
              style={{ maxWidth: "200px" }}
            />
          </Link>
        </div>

        {/* Middle: nav + contact + newsletter */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          <div>
            <h4 className="mb-5 font-display text-xs font-medium uppercase tracking-[0.12em] text-[#fcf8ea]/72">
              Navigation
            </h4>
            <nav className="space-y-3">
              <Link
                to="/artistas"
                className="block w-fit font-display text-sm text-[#fcf8ea] decoration-[#fcf8ea]/70 underline-offset-4 transition-all hover:underline"
              >
                Artists
              </Link>
              <Link
                to="/artworks"
                className="block w-fit font-display text-sm text-[#fcf8ea] decoration-[#fcf8ea]/70 underline-offset-4 transition-all hover:underline"
              >
                Collection
              </Link>
              <Link
                to="/about"
                className="block w-fit font-display text-sm text-[#fcf8ea] decoration-[#fcf8ea]/70 underline-offset-4 transition-all hover:underline"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block w-fit font-display text-sm text-[#fcf8ea] decoration-[#fcf8ea]/70 underline-offset-4 transition-all hover:underline"
              >
                Contact
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="mb-5 font-display text-xs font-medium uppercase tracking-[0.12em] text-[#fcf8ea]/72">
              Contact
            </h4>
            <div className="space-y-3 font-display text-sm text-[#fcf8ea]">
              <p>info@bridgearg.net</p>
              <p>Cordoba, Argentina</p>
              <p>Plantation, FL, United States</p>
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-display text-xs font-medium uppercase tracking-[0.12em] text-[#fcf8ea]/72">
              Newsletter
            </h4>
            <p className="mb-4 font-display text-xs leading-relaxed text-[#fcf8ea]/60">
              Stay updated on new arrivals and exhibitions.
            </p>
            {newsletterStatus === "success" ? (
              <p className="font-display text-xs text-[#fcf8ea]/80">
                ✓ You're subscribed!
              </p>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address for newsletter
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 border border-[#fcf8ea]/20 bg-transparent px-3 py-2 font-display text-xs text-[#fcf8ea] placeholder-[#fcf8ea]/30 outline-none transition-colors focus:border-[#fcf8ea]/50"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === "loading"}
                  className={`border border-[#fcf8ea]/20 px-4 py-2 font-display text-xs uppercase tracking-[0.12em] text-[#fcf8ea] transition-colors hover:bg-background/10 ${
                    newsletterStatus === "loading"
                      ? "cursor-not-allowed opacity-70 hover:bg-transparent"
                      : ""
                  }`}
                >
                  {newsletterStatus === "loading" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subscribing...
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom: payments + copyright + social */}
        <div className="mt-12 border-t border-[#fcf8ea]/12 pt-6 space-y-6">
          {/* Payment security */}
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 opacity-50 hover:opacity-70 transition-opacity">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fcf8ea"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#fcf8ea]">
                Secure checkout powered by Stripe
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <span className="font-display text-[10px] uppercase tracking-[0.1em] text-[#fcf8ea]">
                Visa
              </span>
              <span className="text-[#fcf8ea]/30">·</span>
              <span className="font-display text-[10px] uppercase tracking-[0.1em] text-[#fcf8ea]">
                Mastercard
              </span>
              <span className="text-[#fcf8ea]/30">·</span>
              <span className="font-display text-[10px] uppercase tracking-[0.1em] text-[#fcf8ea]">
                Amex
              </span>
            </div>
          </div>

          {/* Copyright + social */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#fcf8ea]/10 pt-4 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <p className="font-display text-xs uppercase tracking-[0.1em] text-[#fcf8ea]/72">
                © 2026 BridgeArg
              </p>
              <p className="font-display text-[11px] text-[#fcf8ea]/58">
                <Link to="/legal#terms" className="transition-colors hover:text-[#7FB2D1]">
                  Terms &amp; Conditions
                </Link>
                <span className="px-2 text-[#fcf8ea]/35">·</span>
                <Link to="/legal#privacy" className="transition-colors hover:text-[#7FB2D1]">
                  Privacy Policy
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-6">
                {/* TODO: Reemplazar con URLs reales de redes sociales */}
                {/* Instagram: https://www.instagram.com/bridgearg_ */}
                {/* LinkedIn: https://www.linkedin.com/company/bridgearg */}
              <a
                href="https://instagram.com/bridgearg_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-display text-xs text-[#fcf8ea]/72 transition-colors hover:text-[#fcf8ea] truncate block max-w-full"
              >
                <Instagram size={16} strokeWidth={1.5} />
                  <span className="normal-case tracking-normal inline-block max-w-[8rem] truncate">
                    @bridgearg_
                  </span>
              </a>
              <a
                href="https://linkedin.com/company/bridgearg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-display text-xs text-[#fcf8ea]/72 transition-colors hover:text-[#fcf8ea]"
              >
                <Linkedin size={16} strokeWidth={1.5} />
                  <span className="normal-case tracking-normal inline-block max-w-[8rem] truncate">
                    LinkedIn
                  </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

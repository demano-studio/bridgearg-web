import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { createCheckout, getPurchaseVerificationStatus } from "@/lib/api";

type VerificationStatus = "approved" | "declined" | "in_review" | "abandoned" | "pending";
type ViewState = "processing" | "declined" | "in_review" | "abandoned" | "error";

function mapDiditStatus(raw: string | null): VerificationStatus | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "approved") return "approved";
  if (normalized === "declined") return "declined";
  if (normalized === "in review") return "in_review";
  if (normalized === "abandoned") return "abandoned";
  if (normalized === "pending") return "pending";
  return null;
}

const VerificationCallbackPage = () => {
  const location = useLocation();
  const [state, setState] = useState<ViewState>("processing");
  const [message, setMessage] = useState<string>("");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const context = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("didit_verification_context");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { artworkId?: unknown; verificationId?: unknown };
      const artworkId = typeof parsed.artworkId === "number" ? parsed.artworkId : null;
      const verificationId = typeof parsed.verificationId === "string" ? parsed.verificationId : null;
      if (!artworkId || !verificationId) return null;
      return { artworkId, verificationId };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!context) {
        setState("error");
        setMessage("Verification session not found.");
        return;
      }

      const statusFromQuery = mapDiditStatus(new URLSearchParams(location.search).get("status"));
      const applyTerminalStatus = (status: VerificationStatus): boolean => {
        if (status === "declined") {
          setState("declined");
          return true;
        }
        if (status === "in_review") {
          setState("in_review");
          return true;
        }
        if (status === "abandoned") {
          setState("abandoned");
          return true;
        }
        return false;
      };

      const redirectToCheckout = async () => {
        const checkout = await createCheckout({
          artworkId: context.artworkId,
          verificationId: context.verificationId,
        });
        if (!checkout.url) throw new Error("Checkout URL not available");
        window.location.href = checkout.url;
      };

      if (statusFromQuery === "approved") {
        try {
          await redirectToCheckout();
          return;
        } catch (err) {
          if (cancelled) return;
          setState("error");
          setMessage(err instanceof Error ? err.message : "Could not start checkout.");
          return;
        }
      }

      if (statusFromQuery && applyTerminalStatus(statusFromQuery)) {
        return;
      }

      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        const status = await getPurchaseVerificationStatus(context.verificationId);
        if (!status || status === "pending") {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        if (status === "approved") {
          try {
            await redirectToCheckout();
            return;
          } catch (err) {
            if (cancelled) return;
            setState("error");
            setMessage(err instanceof Error ? err.message : "Could not start checkout.");
            return;
          }
        }
        if (applyTerminalStatus(status)) {
          return;
        }
      }

      if (!cancelled) {
        setState("error");
        setMessage("Verification is still pending. Please try again in a moment.");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [context, location.search]);

  const backUrl = context?.artworkId ? `/artworks/${context.artworkId}` : "/artworks";

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Verification callback"
          description="Processing your verification and preparing checkout."
          url="/verify/callback"
        />
        <Header />
        <main className="section-padded">
          <div className="container mx-auto max-w-3xl text-center">
            {state === "processing" ? (
              <>
                <div className="inline-flex items-center gap-3 text-foreground">
                  <Loader2 className={`h-6 w-6 ${prefersReducedMotion ? "" : "animate-spin"}`} aria-hidden />
                  <p className="text-sm uppercase tracking-[0.14em]">Processing verification...</p>
                </div>
                <p className="mt-6 text-muted-foreground">
                  Please wait while we confirm your identity and prepare secure checkout.
                </p>
              </>
            ) : null}

            {state === "declined" ? (
              <>
                <h1 className="text-display text-4xl mb-4">Verification declined</h1>
                <p className="text-muted-foreground mb-8">
                  Your verification was declined. You can return to the artwork and contact us for assistance.
                </p>
              </>
            ) : null}

            {state === "in_review" ? (
              <>
                <h1 className="text-display text-4xl mb-4">Verification in review</h1>
                <p className="text-muted-foreground mb-8">
                  Your verification is under manual review. Please try again shortly.
                </p>
              </>
            ) : null}

            {state === "abandoned" ? (
              <>
                <h1 className="text-display text-4xl mb-4">Verification not completed</h1>
                <p className="text-muted-foreground mb-8">
                  The verification flow was not completed. Please start again from the artwork page.
                </p>
              </>
            ) : null}

            {state === "error" ? (
              <>
                <h1 className="text-display text-4xl mb-4">Could not continue</h1>
                <p className="text-muted-foreground mb-8">
                  {message || "Please return to the artwork and try again."}
                </p>
              </>
            ) : null}

            {state !== "processing" ? (
              <Button variant="acquire" size="xl" asChild>
                <Link to={backUrl}>Back to artwork</Link>
              </Button>
            ) : null}
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default VerificationCallbackPage;

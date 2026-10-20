import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { releaseCheckoutReservation } from "@/lib/api";
import { clearMyVerification, saveMyVerification } from "@/lib/reservation";

// El variant "technical" usa texto blanco (pensado para fondos oscuros) y en esta página, de fondo crema,
// no se veía. Se pinta con el celeste de la marca (--bridge-blue, #7fb2d1) y texto oscuro para que se lea.
const ctaClass = "!border-bridge-blue !bg-bridge-blue !text-bridge-black hover:!bg-bridge-blue/80";

function readContextFromStorage(): { artworkId?: number; verificationId?: string } | null {
  try {
    const raw = sessionStorage.getItem("didit_verification_context");
    if (!raw) return null;
    return JSON.parse(raw) as { artworkId?: number; verificationId?: string };
  } catch {
    return null;
  }
}

const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState(false);

  const artworkParam = searchParams.get("artwork");
  const verificationParam = searchParams.get("verification");

  const context = useMemo(() => readContextFromStorage(), []);

  const verificationId = useMemo(() => {
    if (verificationParam && /^[0-9a-f-]{36}$/i.test(verificationParam)) {
      return verificationParam;
    }
    const fromContext = context?.verificationId;
    if (typeof fromContext === "string" && /^[0-9a-f-]{36}$/i.test(fromContext)) {
      return fromContext;
    }
    return null;
  }, [verificationParam, context]);

  const artwork = artworkParam?.trim() || null;

  const resumeHref = useMemo(() => {
    if (verificationId && artwork) {
      return `/verify/callback?resume=${encodeURIComponent(verificationId)}&artwork=${encodeURIComponent(artwork)}`;
    }
    if (context) return "/verify/callback";
    return null;
  }, [verificationId, artwork, context]);

  useEffect(() => {
    if (!verificationId || !artwork) return;
    const artworkId = Number.parseInt(artwork, 10);
    if (Number.isNaN(artworkId) || artworkId < 1) return;
    saveMyVerification(artworkId, verificationId);
  }, [verificationId, artwork]);

  const handleRelease = async () => {
    if (!verificationId || releasing || released) return;
    setReleasing(true);
    setReleaseError(false);
    try {
      const ok = await releaseCheckoutReservation(verificationId);
      if (ok) {
        clearMyVerification();
        setReleased(true);
      } else {
        setReleaseError(true);
      }
    } catch {
      setReleaseError(true);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Payment Cancelled"
          description="Your payment was cancelled. Return to the collection."
          url="/checkout/cancel"
        />
        <Header />
        <main className="section-padded flex items-center justify-center min-h-[70svh]">
          <div className="container mx-auto max-w-lg text-center">
            <div className="flex justify-center mb-8">
              <XCircle className="h-16 w-16 text-muted-foreground" />
            </div>
            <h1 className="text-display text-4xl md:text-5xl mb-6">
              Payment cancelled
            </h1>
            <p className="text-muted-foreground text-lg mb-4 leading-relaxed">
              No charges were made. You can continue browsing or reach out
              to us if you have any questions.
            </p>
            {verificationId && !released ? (
              <p className="text-muted-foreground text-base mb-10 leading-relaxed">
                We're holding this work for you for a few minutes. You can resume your payment or
                release it for other collectors.
              </p>
            ) : (
              <div className="mb-10" />
            )}
            {released ? (
              <p role="status" className="text-sm text-muted-foreground mb-8">
                Reservation released. The work is available to other collectors again.
              </p>
            ) : null}
            {releaseError ? (
              <p role="alert" className="text-sm text-destructive mb-8">
                We couldn't release the reservation. It will expire on its own in a few minutes.
              </p>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {resumeHref && !released ? (
                <Button variant="technical" className={ctaClass} asChild>
                  <Link to={resumeHref}>Resume payment</Link>
                </Button>
              ) : null}
              {verificationId && !released ? (
                <Button
                  variant="technical"
                  className={ctaClass}
                  onClick={handleRelease}
                  disabled={releasing}
                >
                  Release reservation
                </Button>
              ) : null}
              <Button variant="technical" className={ctaClass} asChild>
                <Link to="/artworks">Back to Works</Link>
              </Button>
              <Button variant="technical" className={ctaClass} asChild>
                <Link to="/contact">Contact us</Link>
              </Button>
              <Button variant="technical" className={ctaClass} asChild>
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default CheckoutCancelPage;

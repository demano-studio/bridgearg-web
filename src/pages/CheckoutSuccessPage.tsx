import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    sessionStorage.removeItem("didit_verification_context");
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Purchase Confirmed"
          description="Your artwork purchase has been confirmed."
          url="/checkout/success"
        />
        <Header />
        <main className="section-padded flex items-center justify-center min-h-[70svh]">
          <div className="container mx-auto max-w-lg text-center">
            <div className="flex justify-center mb-8">
              <CheckCircle className="h-16 w-16 text-foreground" />
            </div>
            <h1 className="text-display text-4xl md:text-5xl mb-6">
              Thank you for your purchase
            </h1>
            <p className="text-muted-foreground text-lg mb-4 leading-relaxed">
              Your acquisition has been confirmed. We will be in touch shortly
              with shipping details and your Certificate of Authenticity.
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground mb-10 font-mono">
                Order ref: {sessionId.slice(-8).toUpperCase()}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="technical" asChild>
                <Link to="/artworks">Continue browsing</Link>
              </Button>
              <Button variant="technical" asChild>
                <Link to="/contacto">Contact us</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default CheckoutSuccessPage;

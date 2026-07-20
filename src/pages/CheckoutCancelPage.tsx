import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const CheckoutCancelPage = () => {
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
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              No charges were made. You can continue browsing or reach out
              to us if you have any questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="technical" asChild>
                <Link to="/artworks">Back to Works</Link>
              </Button>
              <Button variant="technical" asChild>
                <Link to="/contact">Contact us</Link>
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

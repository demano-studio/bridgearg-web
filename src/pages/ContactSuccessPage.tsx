import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/PageTransition";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

const ContactSuccessPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Message Sent"
          description="Your message has been sent to BridgeArg."
          url="/contact/success"
        />
        <Header />
        <main className="section-padded flex items-center justify-center min-h-[70svh]">
          <div className="container mx-auto max-w-lg text-center">
            <div className="flex justify-center mb-8">
              <CheckCircle className="h-16 w-16 text-foreground" />
            </div>
            <h1 className="text-display text-4xl md:text-5xl mb-6">
              Message sent
            </h1>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Thank you for reaching out. We'll get back to you shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="technical" asChild>
                <Link to="/artworks">Continue browsing</Link>
              </Button>
              <Button variant="technical" asChild>
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

export default ContactSuccessPage;

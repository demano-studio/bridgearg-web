import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO title="Page Not Found" />
        <Header />
        <main className="section-padded">
          <div className="container mx-auto flex min-h-[60svh] items-center justify-center text-center">
            <div>
              <span className="text-label block mb-4">Error</span>
              <h1 className="text-display text-8xl mb-4">404</h1>
              <p className="text-muted-foreground text-lg mb-8">Page not found</p>
              <ButtonLikeLink />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default NotFound;

function ButtonLikeLink() {
  return (
    <Link
      to="/"
      className="text-technical inline-flex items-center justify-center border border-border px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
    >
      Back to Home
    </Link>
  );
}

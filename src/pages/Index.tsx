import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandHeroSection } from "@/features/gallery/BrandHeroSection";
import { BrandStorySection } from "@/features/gallery/BrandStorySection";
import { ArtistsSection } from "@/features/gallery/ArtistsSection";
import { SelectedWorksSection } from "@/features/gallery/SelectedWorksSection";
import { BatchStatusSection } from "@/features/gallery/BatchStatusSection";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <SEO
          title="Contemporary Argentine Art"
          description="Curating and connecting extraordinary Argentine contemporary art with global collectors. From Córdoba to the world."
          url="/"
        />
        <Header />
        <main style={{ overflowX: "hidden", width: isTablet ? "100%" : "auto", paddingBottom: isMobile ? "0" : "0" }}>
          <BrandHeroSection />
          <BrandStorySection />
          <SelectedWorksSection />
          <ArtistsSection />
          <BatchStatusSection />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Index;

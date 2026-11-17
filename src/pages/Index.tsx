import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BrandHeroSection } from "@/features/gallery/BrandHeroSection";
import { BridgeNetworkSection, CuratorSection } from "@/features/gallery/BrandStorySection";
import { CollectionSection } from "@/features/gallery/CollectionSection";
import { ArtistsStripSection } from "@/features/gallery/ArtistsStripSection";
import { TradeInSituSection } from "@/features/gallery/TradeInSituSection";
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
          description="Original contemporary art from ten Argentine artists, delivered to collectors, homes and design projects across the US, with provenance, shipping and customs handled for you."
          url="/"
        />
        <Header />
        <main style={{ overflowX: "hidden", width: isTablet ? "100%" : "auto", paddingBottom: isMobile ? "0" : "0" }}>
          <BrandHeroSection />
          <BridgeNetworkSection />
          <CollectionSection />
          <CuratorSection />
          <ArtistsStripSection />
          <TradeInSituSection />
          <BatchStatusSection />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Index;

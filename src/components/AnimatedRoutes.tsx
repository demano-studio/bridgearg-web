import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("@/pages/Index"));
const ArtistasPage = lazy(() => import("@/pages/ArtistasPage"));
const ArtistaDetailPage = lazy(() => import("@/pages/ArtistaDetailPage"));
const ArtworksPage = lazy(() => import("@/pages/ObrasPage"));
const ArtworkDetailPage = lazy(() => import("@/pages/ObraDetailPage"));
const CheckoutSuccessPage = lazy(() => import("@/pages/CheckoutSuccessPage"));
const CheckoutCancelPage = lazy(() => import("@/pages/CheckoutCancelPage"));
const VerificationCallbackPage = lazy(() => import("@/pages/VerificationCallbackPage"));
const NosotrosPage = lazy(() => import("@/pages/NosotrosPage"));
const ContactoPage = lazy(() => import("@/pages/ContactoPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function RedirectArtistasSlug() {
  const { slug } = useParams();
  return <Navigate to={`/artists/${slug ?? ""}`} replace />;
}

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin opacity-50" aria-hidden />
  </div>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={routeFallback}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Index />} />
          <Route path="/artistas" element={<Navigate to="/artists" replace />} />
          <Route path="/artistas/:slug" element={<RedirectArtistasSlug />} />
          <Route path="/artists" element={<ArtistasPage />} />
          <Route path="/artists/:slug" element={<ArtistaDetailPage />} />
          <Route path="/works" element={<Navigate to="/artworks" replace />} />
          <Route path="/collection" element={<Navigate to="/artworks" replace />} />
          <Route path="/artworks" element={<ArtworksPage />} />
          <Route path="/artworks/:id" element={<ArtworkDetailPage />} />
          <Route path="/verify/callback" element={<VerificationCallbackPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="/nosotros" element={<Navigate to="/about" replace />} />
          <Route path="/about" element={<NosotrosPage />} />
          <Route path="/contacto" element={<Navigate to="/contact" replace />} />
          <Route path="/contact" element={<ContactoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

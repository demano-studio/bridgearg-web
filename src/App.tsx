import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { CustomCursor } from "@/components/CustomCursor";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import LegalPage from "@/pages/LegalPage";
import { Loader2 } from "lucide-react";

const AdminApp = lazy(() => import("@/features/admin/AdminApp"));
const AdminObrasPage = lazy(() => import("@/features/admin/pages/ObrasPage"));
const AdminArtistasPage = lazy(() => import("@/features/admin/pages/ArtistasPage"));
const AdminResumenPage = lazy(() => import("@/features/admin/pages/ResumenPage"));

const queryClient = new QueryClient();

const adminFallback = (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin opacity-60" aria-hidden />
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CustomCursor />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route
              path="/admin"
              element={
                <Suspense fallback={adminFallback}>
                  <AdminApp />
                </Suspense>
              }
            >
              <Route index element={<Navigate to="obras" replace />} />
              <Route path="obras" element={<AdminObrasPage />} />
              <Route path="artistas" element={<AdminArtistasPage />} />
              <Route path="lotes/:id" element={<AdminObrasPage />} />
              <Route path="resumen" element={<AdminResumenPage />} />
              <Route path="*" element={<Navigate to="obras" replace />} />
            </Route>
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/*" element={<AnimatedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;

import { useEffect, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { BrevoChat } from "@/components/BrevoChat";
import { CustomCursor } from "@/components/CustomCursor";

import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import LegalPage from "@/pages/LegalPage";
import { Loader2 } from "lucide-react";

import { withSection } from "@/features/admin/withSection";

const AdminApp = lazy(() => import("@/features/admin/AdminApp"));
const AdminObrasPage = withSection(
  "obras",
  lazy(() => import("@/features/admin/pages/ObrasPage")),
);
const AdminLotesPage = withSection(
  "lotes",
  lazy(() => import("@/features/admin/pages/ObrasPage")),
);
const AdminArtistasPage = withSection(
  "artistas",
  lazy(() => import("@/features/admin/pages/ArtistasPage")),
);
const AdminResumenPage = withSection(
  "resumen",
  lazy(() => import("@/features/admin/pages/ResumenPage")),
);
const AdminPedidosPage = withSection(
  "pedidos",
  lazy(() => import("@/features/admin/pages/PedidosPage")),
);
const AdminMensajesPage = withSection(
  "mensajes",
  lazy(() => import("@/features/admin/pages/MensajesPage")),
);
const AdminSuscriptoresPage = withSection(
  "suscriptores",
  lazy(() => import("@/features/admin/pages/SuscriptoresPage")),
);
const AdminTradePage = withSection(
  "trade",
  lazy(() => import("@/features/admin/pages/TradeAdminPage")),
);
const AdminPapeleraPage = withSection(
  "papelera",
  lazy(() => import("@/features/admin/pages/PapeleraPage")),
);
const AdminEquipoPage = withSection(
  "equipo",
  lazy(() => import("@/features/admin/pages/EquipoPage")),
);
const AdminConfiguracionPage = lazy(() => import("@/features/admin/pages/ConfiguracionPage"));
const AdminSinAccesoPage = lazy(() => import("@/features/admin/pages/SinAccesoPage"));

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
          <BrevoChat />
          <Routes>
            <Route
              path="/admin"
              element={
                <Suspense fallback={adminFallback}>
                  <AdminApp />
                </Suspense>
              }
            >
              <Route index element={<Navigate to="resumen" replace />} />
              <Route path="obras" element={<AdminObrasPage />} />
              <Route path="artistas" element={<AdminArtistasPage />} />
              <Route path="lotes/:id" element={<AdminLotesPage />} />
              <Route path="resumen" element={<AdminResumenPage />} />
              <Route path="pedidos" element={<AdminPedidosPage />} />
              <Route path="mensajes" element={<AdminMensajesPage />} />
              <Route path="suscriptores" element={<AdminSuscriptoresPage />} />
              <Route path="trade" element={<AdminTradePage />} />
              <Route path="papelera" element={<AdminPapeleraPage />} />
              <Route path="equipo" element={<AdminEquipoPage />} />
              <Route path="configuracion" element={<AdminConfiguracionPage />} />
              <Route path="sin-acceso" element={<AdminSinAccesoPage />} />
              <Route path="*" element={<Navigate to="resumen" replace />} />
            </Route>
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/*" element={<AnimatedRoutes />} />
          </Routes>
        </BrowserRouter>
        {/* One instance for the whole SPA (public + /admin share this entry). */}
        <Analytics />
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;

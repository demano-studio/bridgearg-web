import * as React from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { AdminBottomNav } from "@/features/admin/components/AdminBottomNav";
import { AdminGlobalSearch } from "@/features/admin/components/AdminGlobalSearch";
import { AdminAccessProvider, useAdminAccess } from "@/features/admin/AdminAccessContext";
import { AdminPwaHead } from "@/features/admin/AdminPwaHead";
import { AdminSectionTransition } from "@/features/admin/AdminSectionTransition";
import { useAdminPwa } from "@/features/admin/useAdminPwa";
import "@/styles/admin.css";

function adminPathLabel(pathname: string) {
  const rest = pathname.replace(/^\/admin\/?/, "") || "resumen";
  if (rest === "resumen") return "Resumen";
  if (rest === "obras") return "Obras";
  if (rest === "artistas") return "Artistas";
  if (rest === "pedidos") return "Pedidos";
  if (rest === "mensajes") return "Mensajes";
  if (rest === "suscriptores") return "Suscriptores";
  if (rest === "trade") return "Trade";
  if (rest === "papelera") return "Papelera";
  if (rest === "equipo") return "Equipo";
  if (rest === "configuracion") return "Configuración";
  if (rest === "sin-acceso") return "Sin acceso";
  const lote = rest.match(/^lotes\/(\d+)$/);
  if (lote) return `Lote ${lote[1]}`;
  return rest;
}

function AdminLogin() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      const { error: signErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (signErr) setError(signErr.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-root admin-login">
      <form onSubmit={onSubmit} className="admin-login__card">
        <h1 className="admin-login__title">Bridgearg Admin</h1>
        <p className="admin-login__hint">Ingresá con tu usuario de Supabase Auth.</p>
        <div className="space-y-4">
          <div className="admin-field space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="admin-field space-y-2">
            <Label htmlFor="admin-password">Contraseña</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="admin-login__error">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const { user, loading, isConfigured, signOut } = useAuth();
  const location = useLocation();
  useAdminPwa();

  React.useEffect(() => {
    document.body.classList.add("admin-ui");
    return () => document.body.classList.remove("admin-ui");
  }, []);

  if (!isConfigured) {
    return (
      <>
        <AdminPwaHead />
        <div className="admin-root admin-login">
          <p className="max-w-md text-center text-sm text-[rgba(252,248,234,0.7)]">
            Supabase no está configurado. Definí <code className="text-xs">VITE_SUPABASE_URL</code> y{" "}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> en <code className="text-xs">.env</code>.
          </p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <AdminPwaHead />
        <div className="admin-root admin-login">
          <Loader2 className="h-8 w-8 animate-spin opacity-60 text-[#fcf8ea]" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AdminPwaHead />
        <AdminLogin />
      </>
    );
  }

  return (
    <>
      <AdminPwaHead />
      <AdminAccessProvider>
        <AdminShell pathLabel={adminPathLabel(location.pathname)} onSignOut={() => void signOut()} />
      </AdminAccessProvider>
    </>
  );
}

function AdminShell({ pathLabel, onSignOut }: { pathLabel: string; onSignOut: () => void }) {
  const access = useAdminAccess();

  if (!access.ready) {
    return (
      <div className="admin-root admin-login">
        <Loader2 className="h-8 w-8 animate-spin opacity-60 text-[#fcf8ea]" />
      </div>
    );
  }

  if (!access.isMember && !access.isOwner) {
    return (
      <div className="admin-root admin-login">
        <div className="admin-login__card space-y-4 text-center">
          <h1 className="admin-login__title">Sin acceso</h1>
          <p className="text-sm text-[rgba(252,248,234,0.7)]">
            Tu cuenta no forma parte del equipo admin. Pedile al owner que te invite.
          </p>
          <Button type="button" variant="outline" className="border-[rgba(252,248,234,0.3)] text-[#fcf8ea]" onClick={onSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  // Member with all permissions revoked — keep Auth session, block every section.
  const hasAnySection =
    access.isOwner ||
    access.firstAllowedPath() !== "/admin/sin-acceso";
  if (!hasAnySection) {
    return (
      <div className="admin-root admin-login">
        <div className="admin-login__card space-y-4 text-center">
          <h1 className="admin-login__title">Sin acceso</h1>
          <p className="text-sm text-[rgba(252,248,234,0.7)]">
            Tu cuenta no tiene permisos en ninguna sección. Pedile al owner que te vuelva a habilitar el acceso.
          </p>
          <Button type="button" variant="outline" className="border-[rgba(252,248,234,0.3)] text-[#fcf8ea]" onClick={onSignOut}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__path">{pathLabel}</div>
          <AdminGlobalSearch />
          <div className="admin-topbar__actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden border-[rgba(30,21,23,0.28)] text-[10px] uppercase tracking-wider md:inline-flex"
              onClick={onSignOut}
            >
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="admin-content">
          <AdminSectionTransition />
        </main>
        <AdminBottomNav />
      </div>
    </div>
  );
}

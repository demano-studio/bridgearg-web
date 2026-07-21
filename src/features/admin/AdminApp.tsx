import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

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
    <div className="admin-root flex min-h-screen items-center justify-center bg-[#faf9ef] px-4 font-display text-bridge-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-bridge-black/20 bg-bridge-cream/40 p-8 shadow-none"
        style={{ borderRadius: 0 }}
      >
        <h1 className="mb-1 text-lg font-semibold tracking-wide">Bridgearg Admin</h1>
        <p className="mb-6 text-sm text-muted-foreground">Ingresá con tu usuario de Supabase Auth.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-none border-bridge-black/25"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-none border-bridge-black/25"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full rounded-none">
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

  if (!isConfigured) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center bg-[#faf9ef] p-6 font-display text-bridge-black">
        <p className="max-w-md text-center text-sm">
          Supabase no está configurado. Definí <code className="text-xs">VITE_SUPABASE_URL</code> y{" "}
          <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> en <code className="text-xs">.env</code>.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center bg-[#faf9ef] font-display text-bridge-black">
        <Loader2 className="h-8 w-8 animate-spin opacity-60" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return (
    <div className="admin-root flex min-h-screen bg-[#faf9ef] font-display text-bridge-black">
      <AdminSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:border-l md:border-bridge-black/15">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-bridge-black/15 px-4 py-3 pl-14 md:pl-4">
          <div className="min-w-0 truncate text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {location.pathname.replace(/^\/admin\/?/, "") || "obras"}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-bridge-black/30 text-[10px] uppercase tracking-wider"
              onClick={() => {
                void signOut();
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

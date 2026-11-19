import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";
import { Button } from "@/components/ui/button";

export default function ConfiguracionPage() {
  const { signOut } = useAuth();
  const access = useAdminAccess();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Cuenta y preferencias del panel.</p>
      </div>

      <section className="space-y-3 border border-bridge-black/15 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cuenta</h2>
        <p className="text-sm">
          Sesión: <span className="font-medium">{access.email ?? "—"}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-bridge-black/20"
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </Button>
      </section>

      <section className="space-y-2 border border-dashed border-bridge-black/20 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notificaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Las notificaciones push del admin se configuran acá en una próxima fase. Por ahora seguís
          recibiendo alertas por Telegram.
        </p>
      </section>
    </div>
  );
}

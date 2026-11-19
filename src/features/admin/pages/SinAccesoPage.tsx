import { Link } from "react-router-dom";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";

export default function SinAccesoPage() {
  const access = useAdminAccess();
  const fallback = access.firstAllowedPath();

  return (
    <div className="space-y-3 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Sin acceso</h1>
      <p className="text-sm text-muted-foreground">
        No tenés permiso para ver esta sección. Pedile al owner que te habilite el acceso.
      </p>
      {fallback !== "/admin/sin-acceso" ? (
        <Link to={fallback} className="text-sm underline-offset-2 hover:underline">
          Ir a una sección disponible
        </Link>
      ) : null}
    </div>
  );
}

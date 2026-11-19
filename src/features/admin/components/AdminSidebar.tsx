import { useNavigate, NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { AdminLoteRow } from "@/features/admin/types";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";

function navClassName({ isActive }: { isActive: boolean }) {
  return `admin-nav-link${isActive ? " is-active" : ""}`;
}

function CountBadge({ value }: { value: number | undefined }) {
  if (value == null) return null;
  return <span className="admin-nav-badge">{value}</span>;
}

/** Desktop-only sidebar. Mobile uses AdminBottomNav (no hamburger/drawer). */
export function AdminSidebar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useAdminAccess();
  const canView = access.canView;
  const canEditLotes = access.canEdit("lotes");

  const { data: lotes = [] } = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id,nombre,fecha,created_at")
        .is("deleted_at", null)
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminLoteRow[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin", "sidebar", "counts"],
    queryFn: async () => {
      const sb = getSupabase();
      const [obras, artistas, tradePending, pedidosOpen, mensajesOpen, suscriptores, papeleraObras, papeleraLotes] =
        await Promise.all([
          sb.from("artworks").select("id", { count: "exact", head: true }).is("deleted_at", null),
          sb.from("artists").select("id", { count: "exact", head: true }),
          sb.from("trade_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
          sb.from("purchases").select("id", { count: "exact", head: true }).neq("shipping_status", "delivered"),
          sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
          sb.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
          sb.from("artworks").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
          sb.from("lotes").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
        ]);
      return {
        obras: obras.count ?? 0,
        artistas: artistas.count ?? 0,
        tradePending: tradePending.error ? undefined : (tradePending.count ?? 0),
        pedidosOpen: pedidosOpen.error ? undefined : (pedidosOpen.count ?? 0),
        mensajesOpen: mensajesOpen.error ? undefined : (mensajesOpen.count ?? 0),
        suscriptores: suscriptores.error ? undefined : (suscriptores.count ?? 0),
        papelera: (papeleraObras.count ?? 0) + (papeleraLotes.count ?? 0),
      };
    },
  });

  const { data: obrasByLote = new Map<number, number>() } = useQuery({
    queryKey: ["admin", "sidebar", "lote-counts"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("artworks").select("lote_id").is("deleted_at", null);
      if (error) throw new Error(error.message);
      const m = new Map<number, number>();
      for (const row of data ?? []) {
        const lid = (row as { lote_id: number | null }).lote_id;
        if (lid == null) continue;
        m.set(lid, (m.get(lid) ?? 0) + 1);
      }
      return m;
    },
  });

  const createLote = useMutation({
    mutationFn: async () => {
      const nombre = `Nuevo lote ${new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`;
      return (await adminWrite("lote.create", { nombre })) as { id: number; nombre: string };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin", "lotes"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
      toast({ title: "Lote creado", description: data.nombre });
      if (data?.id) navigate(`/admin/lotes/${data.id}`);
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo crear el lote", description: e.message, variant: "destructive" });
    },
  });

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-title">Bridgearg Admin</div>
      </div>
      <nav className="admin-sidebar__nav">
        {canView("resumen") ? (
          <>
            <div className="admin-sidebar__section">Inicio</div>
            <NavLink to="/admin/resumen" className={navClassName}>
              Resumen
            </NavLink>
          </>
        ) : null}

        {canView("obras") || canView("artistas") || canView("lotes") ? (
          <div className="admin-sidebar__section">Catálogo</div>
        ) : null}
        {canView("obras") ? (
          <NavLink to="/admin/obras" className={navClassName} end>
            <span>Obras</span>
            <CountBadge value={counts?.obras} />
          </NavLink>
        ) : null}
        {canView("artistas") ? (
          <NavLink to="/admin/artistas" className={navClassName}>
            <span>Artistas</span>
            <CountBadge value={counts?.artistas} />
          </NavLink>
        ) : null}

        {canView("lotes") ? (
          <>
            <div className="admin-sidebar__section">Lotes</div>
            <ul className="space-y-0.5">
              {lotes.map((l) => (
                <li key={l.id}>
                  <NavLink to={`/admin/lotes/${l.id}`} className={navClassName}>
                    <span className="truncate">{l.nombre}</span>
                    <CountBadge value={obrasByLote.get(l.id) ?? 0} />
                  </NavLink>
                </li>
              ))}
            </ul>
            {canEditLotes ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="admin-sidebar__cta border-[rgba(252,248,234,0.25)] bg-transparent text-[10px] uppercase tracking-wider text-[#fcf8ea] hover:bg-[rgba(252,248,234,0.08)] hover:text-[#fcf8ea]"
                disabled={createLote.isPending}
                onClick={() => createLote.mutate()}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo lote
              </Button>
            ) : null}
          </>
        ) : null}

        {canView("pedidos") ||
        canView("mensajes") ||
        canView("suscriptores") ||
        canView("trade") ||
        canView("papelera") ||
        access.isOwner ? (
          <div className="admin-sidebar__section">Operación</div>
        ) : null}
        {canView("pedidos") ? (
          <NavLink to="/admin/pedidos" className={navClassName}>
            <span>Pedidos</span>
            <CountBadge value={counts?.pedidosOpen} />
          </NavLink>
        ) : null}
        {canView("mensajes") ? (
          <NavLink to="/admin/mensajes" className={navClassName}>
            <span>Mensajes</span>
            <CountBadge value={counts?.mensajesOpen} />
          </NavLink>
        ) : null}
        {canView("suscriptores") ? (
          <NavLink to="/admin/suscriptores" className={navClassName}>
            <span>Suscriptores</span>
            <CountBadge value={counts?.suscriptores} />
          </NavLink>
        ) : null}
        {canView("trade") ? (
          <NavLink to="/admin/trade" className={navClassName}>
            <span>Trade</span>
            <CountBadge value={counts?.tradePending} />
          </NavLink>
        ) : null}
        {canView("papelera") ? (
          <NavLink to="/admin/papelera" className={navClassName}>
            <span>Papelera</span>
            <CountBadge value={counts?.papelera} />
          </NavLink>
        ) : null}
        {access.isOwner ? (
          <NavLink to="/admin/equipo" className={navClassName}>
            <span>Equipo</span>
          </NavLink>
        ) : null}
        <NavLink to="/admin/configuracion" className={navClassName}>
          <span>Configuración</span>
        </NavLink>
      </nav>
    </aside>
  );
}

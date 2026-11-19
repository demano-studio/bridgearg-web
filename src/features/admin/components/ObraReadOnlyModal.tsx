import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import type { AdminArtworkRow, AdminArtworkStatus } from "@/features/admin/types";
import { adminArtworkStatusLabel } from "@/features/admin/adminUtils";
import type { PiezaConjunto } from "@/lib/api";
import { getSupabase } from "@/lib/supabaseClient";
import { getArtworkImagePublicUrl } from "@/lib/supabaseStorage";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function asPiezas(raw: unknown): PiezaConjunto[] {
  if (!Array.isArray(raw)) return [];
  return raw as PiezaConjunto[];
}

type HistoryRow = {
  id: number;
  from_status: AdminArtworkStatus | null;
  to_status: AdminArtworkStatus;
  changed_by_email: string | null;
  changed_at: string;
};

type Props = {
  row: AdminArtworkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ObraReadOnlyModal({ row, open, onOpenChange }: Props) {
  const { data: lotes = [] } = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id,nombre")
        .is("deleted_at", null)
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: number; nombre: string }>;
    },
    enabled: open,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin", "artwork-status-history", row?.id],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artwork_status_history")
        .select("id,from_status,to_status,changed_by_email,changed_at")
        .eq("artwork_id", row!.id)
        .order("changed_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as HistoryRow[];
    },
    enabled: open && row != null,
  });

  const [copying, setCopying] = React.useState(false);

  async function copyShareLink() {
    if (!row) return;
    const url = `${window.location.origin}/artworks/${row.id}`;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "No se pudo copiar el link", description: url, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  }

  if (!row) return null;

  const img = row.image_url?.startsWith("http") ? row.image_url : getArtworkImagePublicUrl(row.image_url);
  const extras = Array.isArray(row.extra_image_paths) ? (row.extra_image_paths as string[]) : [];
  const loteNombre =
    row.lote_id == null ? "—" : (lotes.find((l) => l.id === row.lote_id)?.nombre ?? "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog--sheet !flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden border-bridge-black/20 p-0">
        <DialogHeader className="shrink-0 border-b border-bridge-black/10 px-6 py-4 pr-12 text-left">
          <div className="flex items-start gap-2">
            <DialogTitle className="min-w-0 flex-1 text-lg font-semibold">{row.title}</DialogTitle>
            <button
              type="button"
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-bridge-black/15 text-muted-foreground transition-colors hover:border-bridge-black/30 hover:text-foreground"
              aria-label="Copiar link público"
              title="Copiar link"
              disabled={copying}
              onClick={() => void copyShareLink()}
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>
        <div className="admin-dialog-body flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 py-4 text-sm">
          {/* Own block — never share stacking with the data grid */}
          <figure className="admin-obra-view-media relative isolate m-0 block w-full shrink-0 overflow-hidden border border-bridge-black/10 bg-[rgba(30,21,23,0.04)]">
            {img ? (
              <img
                src={img}
                alt=""
                className="relative z-0 mx-auto block h-auto max-h-[min(42vh,360px)] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-xs uppercase tracking-wider text-muted-foreground">
                Sin imagen
              </div>
            )}
          </figure>

          <dl className="relative z-10 m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row label="Artista" value={row.artists?.name ?? "—"} />
            <Row label="Estado venta" value={adminArtworkStatusLabel(row.status)} />
            <Row label="Tipo" value={row.tipo ?? "—"} />
            <Row label="Enmarcado" value={row.enmarque ?? "—"} />
            <Row label="Certificado" value={row.certificado ? "Sí" : "No"} />
            <Row label="Es conjunto" value={row.es_conjunto ? "Sí" : "No"} />
            <Row label="Año" value={row.year ?? "—"} />
            <Row label="Técnica" value={row.medium ?? "—"} />
            <Row label="Materiales" value={row.materiales ?? "—"} />
            <Row label="Dimensiones (texto)" value={row.dimensions ?? "—"} />
            <Row label="Ancho cm" value={row.width_cm != null ? String(row.width_cm) : "—"} />
            <Row label="Largo / alto cm" value={row.height_cm != null ? String(row.height_cm) : "—"} />
            <Row label="Profundidad cm" value={row.depth_cm != null ? String(row.depth_cm) : "—"} />
            <Row label="Peso kg" value={row.weight_kg != null ? String(row.weight_kg) : "—"} />
            <Row label="Precio ref. U$D" value={row.price_ref_usd != null ? String(row.price_ref_usd) : "—"} />
            <Row label="Precio publicado U$D" value={row.price_usd != null ? String(row.price_usd) : "—"} />
            <Row label="Ubicación" value={row.ubicacion ?? "—"} />
            <Row label="Estado de pago" value={row.estado_pago ?? "—"} />
            <Row label="Comprador" value={row.comprador ?? "—"} />
            <Row label="Contacto comprador" value={row.comprador_contacto ?? "—"} />
            <Row label="Fecha venta" value={row.fecha_venta ?? "—"} />
            <Row label="Lote" value={loteNombre} />
            <Row label="Notas" value={row.notas ?? "—"} className="sm:col-span-2" />
          </dl>

          {asPiezas(row.piezas).length > 0 ? (
            <div className="relative z-10 shrink-0">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Piezas del conjunto
              </div>
              <ul className="space-y-2 border border-bridge-black/10 p-3">
                {asPiezas(row.piezas).map((p, i) => (
                  <li key={i} className="text-xs">
                    <strong>{p.nombre}</strong> — L{p.largo ?? "—"} A{p.ancho ?? "—"} P{p.profundidad ?? "—"} W
                    {p.peso ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {extras.length > 0 ? (
            <div className="relative z-10 shrink-0">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Más imágenes
              </div>
              <div className="flex flex-wrap gap-2">
                {extras.map((path) => (
                  <img
                    key={path}
                    src={path.startsWith("http") ? path : getArtworkImagePublicUrl(path)}
                    alt=""
                    className="relative h-20 w-20 border border-bridge-black/10 object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {history.length > 0 ? (
            <div className="relative z-10 shrink-0 border-t border-bridge-black/10 pt-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Historial
              </div>
              <ul className="space-y-2">
                {history.map((h) => {
                  const from = h.from_status ? adminArtworkStatusLabel(h.from_status) : "—";
                  const to = adminArtworkStatusLabel(h.to_status);
                  const who = h.changed_by_email?.trim() || "—";
                  return (
                    <li key={h.id} className="text-sm text-foreground/90">
                      {from} → {to} · {formatHistoryDate(h.changed_at)} · {who}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

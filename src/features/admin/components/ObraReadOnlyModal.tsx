import type { AdminArtworkRow } from "@/features/admin/types";
import { adminArtworkStatusLabel } from "@/features/admin/adminUtils";
import type { PiezaConjunto } from "@/lib/api";
import { getArtworkImagePublicUrl } from "@/lib/supabaseStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function asPiezas(raw: unknown): PiezaConjunto[] {
  if (!Array.isArray(raw)) return [];
  return raw as PiezaConjunto[];
}

type Props = {
  row: AdminArtworkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ObraReadOnlyModal({ row, open, onOpenChange }: Props) {
  if (!row) return null;
  const img = row.image_url?.startsWith("http") ? row.image_url : getArtworkImagePublicUrl(row.image_url);
  const extras = Array.isArray(row.extra_image_paths) ? (row.extra_image_paths as string[]) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-2xl rounded-none border-bridge-black/20 p-0 font-display">
        <DialogHeader className="border-b border-bridge-black/10 px-6 py-4 text-left">
          <DialogTitle className="pr-8 text-lg font-semibold">{row.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90svh-5rem)] px-6 py-4">
          <div className="space-y-4 text-sm">
            <div className="aspect-[4/3] w-full max-w-md border border-bridge-black/10 bg-muted/20">
              <img src={img} alt="" className="h-full w-full object-contain" />
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
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
              <Row label="Fecha venta" value={row.fecha_venta ?? "—"} />
              <Row label="Lote id" value={row.lote_id != null ? String(row.lote_id) : "—"} />
              <Row label="Notas" value={row.notas ?? "—"} className="sm:col-span-2" />
            </dl>
            {asPiezas(row.piezas).length > 0 ? (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Piezas del conjunto</div>
                <ul className="space-y-2 border border-bridge-black/10 p-3">
                  {asPiezas(row.piezas).map((p, i) => (
                    <li key={i} className="text-xs">
                      <strong>{p.nombre}</strong> — L{p.largo ?? "—"} A{p.ancho ?? "—"} P{p.profundidad ?? "—"} W{p.peso ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {extras.length > 0 ? (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Más imágenes</div>
                <div className="flex flex-wrap gap-2">
                  {extras.map((path) => (
                    <img
                      key={path}
                      src={path.startsWith("http") ? path : getArtworkImagePublicUrl(path)}
                      alt=""
                      className="h-20 w-20 border border-bridge-black/10 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

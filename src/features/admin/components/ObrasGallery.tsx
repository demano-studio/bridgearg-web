import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminWrite } from "@/lib/api";
import { adminArtworkStatusLabel } from "@/features/admin/adminUtils";
import type { AdminArtworkRow, AdminArtworkStatus } from "@/features/admin/types";
import { resolveAdminImageSrc } from "@/lib/supabaseStorage";
import { isSupabaseStorageObjectUrl, transformUrl } from "@/lib/imageTransform";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SoldBuyerPrompt, todayDateIso, type SoldBuyerValues } from "@/features/admin/components/SoldBuyerPrompt";

const STATUS_OPTIONS: AdminArtworkStatus[] = ["available", "reserved", "sold"];

function statusClass(status: AdminArtworkStatus | string): string {
  if (status === "sold") return "admin-status admin-status--filled";
  if (status === "reserved") return "admin-status admin-status--muted";
  return "admin-status";
}

function GalleryCardImage({ path, title }: { path: string; title: string }) {
  const publicUrl = resolveAdminImageSrc(path, "artworks") ?? "";
  const preferred =
    publicUrl && isSupabaseStorageObjectUrl(publicUrl)
      ? transformUrl(publicUrl, { width: 480, quality: 70 })
      : publicUrl;
  const [src, setSrc] = React.useState(preferred || publicUrl);

  React.useEffect(() => {
    setSrc(preferred || publicUrl);
  }, [preferred, publicUrl]);

  if (!publicUrl) {
    return (
      <div className="admin-obras-gallery__media admin-obras-gallery__media--empty" aria-hidden>
        Sin foto
      </div>
    );
  }

  return (
    <div className="admin-obras-gallery__media">
      <img
        src={src}
        alt={title}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (src !== publicUrl) setSrc(publicUrl);
        }}
      />
    </div>
  );
}

type Props = {
  rows: AdminArtworkRow[];
  isLoading: boolean;
  canEdit?: boolean;
};

type SoldTarget = { id: number; title: string; snapshot: AdminArtworkRow };

export function ObrasGallery({ rows, isLoading, canEdit = true }: Props) {
  const qc = useQueryClient();
  const [menuId, setMenuId] = React.useState<number | null>(null);
  const [pendingId, setPendingId] = React.useState<number | null>(null);
  const [soldTarget, setSoldTarget] = React.useState<SoldTarget | null>(null);
  const [soldSubmitting, setSoldSubmitting] = React.useState(false);
  const pendingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

  function clearPendingSoon() {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = null;
  }

  function markPending(id: number) {
    clearPendingSoon();
    setPendingId(id);
    // Safety: never leave the card visually "busy" forever if the network hangs.
    pendingTimerRef.current = setTimeout(() => {
      setPendingId((cur) => (cur === id ? null : cur));
      pendingTimerRef.current = null;
    }, 12_000);
  }

  function clearPending(id: number) {
    clearPendingSoon();
    setPendingId((cur) => (cur === id ? null : cur));
  }

  function patchArtwork(id: number, patch: Partial<AdminArtworkRow>) {
    qc.setQueryData<AdminArtworkRow[]>(["admin", "artworks", "full"], (old) =>
      (old ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function latestRow(id: number, fallback: AdminArtworkRow): AdminArtworkRow {
    const cached = qc.getQueryData<AdminArtworkRow[]>(["admin", "artworks", "full"]);
    return cached?.find((r) => r.id === id) ?? fallback;
  }

  async function applyStatus(
    row: AdminArtworkRow,
    next: AdminArtworkStatus,
    extra?: { comprador?: string; comprador_contacto?: string; fecha_venta?: string },
  ) {
    const current = latestRow(row.id, row);
    if (current.status === next && next !== "sold") return;
    // Re-selling (sold → sold with new buyer) is only via SoldBuyerPrompt; skip no-op sold without extras.
    if (current.status === next && next === "sold" && !extra) return;

    const prev = {
      status: current.status,
      comprador: current.comprador,
      comprador_contacto: current.comprador_contacto,
      fecha_venta: current.fecha_venta,
    };
    markPending(row.id);
    patchArtwork(row.id, {
      status: next,
      ...(extra?.comprador != null ? { comprador: extra.comprador } : {}),
      ...(extra?.comprador_contacto != null ? { comprador_contacto: extra.comprador_contacto } : {}),
      ...(extra?.fecha_venta != null ? { fecha_venta: extra.fecha_venta } : {}),
    });

    try {
      await adminWrite("artwork.update", {
        id: row.id,
        status: next,
        ...(extra ?? {}),
      });
      toast({ title: `Actualizado a ${adminArtworkStatusLabel(next)}` });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      void qc.invalidateQueries({ queryKey: ["admin", "artwork-status-history", row.id] });
    } catch (e) {
      patchArtwork(row.id, prev);
      toast({
        title: "No se pudo actualizar, intentá de nuevo",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      throw e;
    } finally {
      clearPending(row.id);
    }
  }

  function requestStatus(row: AdminArtworkRow, next: AdminArtworkStatus) {
    setMenuId(null);
    const current = latestRow(row.id, row);
    if (current.status === next) return;

    if (next === "sold") {
      setSoldTarget({ id: row.id, title: current.title, snapshot: current });
      return;
    }
    void applyStatus(current, next);
  }

  async function confirmSold(values: SoldBuyerValues) {
    if (!soldTarget) return;
    const row = latestRow(soldTarget.id, soldTarget.snapshot);
    setSoldSubmitting(true);
    try {
      await applyStatus(row, "sold", {
        comprador: values.comprador,
        comprador_contacto: values.comprador_contacto,
        fecha_venta: todayDateIso(),
      });
      setSoldTarget(null);
      // Radix Dialog/Sheet can leave body pointer-events stuck after close on some mobile browsers.
      requestAnimationFrame(() => {
        if (document.body.style.pointerEvents === "none") {
          document.body.style.pointerEvents = "";
        }
      });
    } catch {
      // toast already shown; keep prompt open so they can retry or cancel
    } finally {
      setSoldSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay obras con estos filtros.</p>;
  }

  return (
    <>
      <div className="admin-obras-gallery">
        {rows.map((r) => {
          const busy = pendingId === r.id;
          return (
            <article key={r.id} className={`admin-obras-gallery__card${busy ? " is-busy" : ""}`}>
              <GalleryCardImage path={r.image_url} title={r.title} />
              <div className="admin-obras-gallery__body">
                <h2 className="admin-obras-gallery__title">{r.title}</h2>
                <p className="admin-obras-gallery__artist">{r.artists?.name ?? "—"}</p>
                <div className="admin-obras-gallery__meta">
                  <span className="admin-obras-gallery__price">
                    {r.price_usd != null ? `U$D ${r.price_usd}` : "—"}
                  </span>
                  {canEdit ? (
                    <DropdownMenu
                      open={menuId === r.id}
                      onOpenChange={(open) => setMenuId(open ? r.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={`${statusClass(r.status)} admin-obras-gallery__status-btn`}
                          aria-busy={busy || undefined}
                          aria-label={`Cambiar estado de ${r.title}`}
                        >
                          {adminArtworkStatusLabel(r.status)}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="bottom"
                        className="admin-obras-gallery__menu w-[min(100vw-2rem,16rem)] border-bridge-black/20 p-2"
                      >
                        <DropdownMenuLabel className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Estado
                        </DropdownMenuLabel>
                        {STATUS_OPTIONS.map((opt) => {
                          const active = r.status === opt;
                          return (
                            <DropdownMenuItem
                              key={opt}
                              className={`admin-obras-gallery__menu-item${active ? " is-active" : ""}`}
                              onSelect={() => {
                                requestStatus(r, opt);
                              }}
                            >
                              <span className={statusClass(opt)}>{adminArtworkStatusLabel(opt)}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className={`${statusClass(r.status)} admin-obras-gallery__status-btn`}>
                      {adminArtworkStatusLabel(r.status)}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <SoldBuyerPrompt
        open={soldTarget != null}
        artworkTitle={soldTarget?.title ?? ""}
        submitting={soldSubmitting}
        onOpenChange={(open) => {
          if (!open && !soldSubmitting) {
            setSoldTarget(null);
            requestAnimationFrame(() => {
              if (document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
              }
            });
          }
        }}
        onConfirm={(values) => void confirmSold(values)}
      />
    </>
  );
}

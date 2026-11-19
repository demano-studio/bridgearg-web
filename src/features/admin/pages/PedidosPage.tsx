import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { resolveAdminImageSrc } from "@/lib/supabaseStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { AdminPurchaseRow, AdminShippingStatus } from "@/features/admin/types";
import {
  adminPaymentLabel,
  adminShippingLabel,
  isPurchasePaid,
  nextShippingStatus,
} from "@/features/admin/adminUtils";
import { csvStamp, downloadCsv } from "@/features/admin/csv";

const SHIPPING_FILTERS: Array<{ value: string; label: string }> = [
  { value: "__open", label: "Pendientes de entrega" },
  { value: "__all", label: "Todos" },
  { value: "paid", label: "Pagado" },
  { value: "preparing", label: "Preparando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
];

export default function PedidosPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("id");
  const [shippingFilter, setShippingFilter] = React.useState("__open");
  const [q, setQ] = React.useState("");
  const deferredQ = React.useDeferredValue(q);
  const [detail, setDetail] = React.useState<AdminPurchaseRow | null>(null);
  const openedFromSearch = React.useRef<number | null>(null);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "purchases"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error: qErr } = await sb
        .from("purchases")
        .select(
          "id,artwork_id,buyer_name,buyer_email,shipping_address,amount_usd,currency,payment_status,shipping_status,stripe_session_id,stripe_payment_intent_id,created_at,artworks(id,title,image_url,artists(name))",
        )
        .order("created_at", { ascending: false });
      if (qErr) throw new Error(qErr.message);
      return (data ?? []) as AdminPurchaseRow[];
    },
  });

  React.useEffect(() => {
    if (!openId || !/^\d+$/.test(openId) || rows.length === 0) return;
    const id = Number(openId);
    if (openedFromSearch.current === id) return;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    openedFromSearch.current = id;
    setShippingFilter("__all");
    setDetail(row);
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
  }, [openId, rows, searchParams, setSearchParams]);

  const filtered = React.useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (shippingFilter === "__open" && r.shipping_status === "delivered") return false;
      if (
        shippingFilter !== "__all" &&
        shippingFilter !== "__open" &&
        r.shipping_status !== shippingFilter
      ) {
        return false;
      }
      if (!needle) return true;
      const artworkTitle = artworkMeta(r).title.toLowerCase();
      const artistName = (artworkMeta(r).artist ?? "").toLowerCase();
      const hay = [
        r.buyer_name ?? "",
        r.buyer_email ?? "",
        artworkTitle,
        artistName,
        String(r.id),
        String(r.artwork_id),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, shippingFilter, deferredQ]);

  const openCount = React.useMemo(
    () => rows.filter((r) => r.shipping_status !== "delivered").length,
    [rows],
  );

  const updateShipping = useMutation({
    mutationFn: async (input: { id: number; shipping_status: AdminShippingStatus }) =>
      adminWrite("purchase.updateShipping", input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["admin", "purchases"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar", "counts"] });
      toast({ title: "Estado de envío actualizado", description: adminShippingLabel(vars.shipping_status) });
      setDetail((prev) =>
        prev && prev.id === vars.id ? { ...prev, shipping_status: vars.shipping_status } : prev,
      );
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo actualizar", description: e.message, variant: "destructive" });
    },
  });

  function advance(row: AdminPurchaseRow) {
    const next = nextShippingStatus(row.shipping_status);
    if (!next) return;
    updateShipping.mutate({ id: row.id, shipping_status: next });
  }

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: "Nada para exportar", description: "No hay pedidos con el filtro actual." });
      return;
    }
    downloadCsv(
      `pedidos-${csvStamp()}.csv`,
      [
        "ID",
        "Fecha",
        "Comprador",
        "Email",
        "Obra",
        "Artista",
        "Monto (USD)",
        "Pago",
        "Envío",
        "Dirección",
      ],
      filtered.map((r) => {
        const meta = artworkMeta(r);
        return [
          r.id,
          r.created_at,
          r.buyer_name,
          r.buyer_email,
          meta.title,
          meta.artist,
          r.amount_usd,
          adminPaymentLabel(r.payment_status),
          adminShippingLabel(r.shipping_status),
          r.shipping_address,
        ];
      }),
    );
    toast({ title: "CSV descargado", description: `${filtered.length} pedido(s)` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Pagos Stripe y estado de envío
            {rows.length > 0 ? ` · ${openCount} pendiente${openCount === 1 ? "" : "s"}` : ""}.
          </p>
        </div>
        <Button type="button" variant="outline" disabled={filtered.length === 0} onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      <div className="admin-filters grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Buscar</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Comprador, email u obra…"
            className="border-bridge-black/20"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Envío</Label>
          <Select value={shippingFilter} onValueChange={setShippingFilter}>
            <SelectTrigger className="border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : isError ? (
        <p className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          No se pudieron cargar los pedidos{error instanceof Error && error.message ? `: ${error.message}` : "."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="border-t border-[rgba(30,21,23,0.14)] py-8 text-sm text-muted-foreground">
          {rows.length === 0
            ? "Todavía no hay pedidos registrados. Aparecen acá cuando Stripe confirma un pago."
            : "No hay pedidos con este filtro."}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Envío</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const next = nextShippingStatus(r.shipping_status);
                const meta = artworkMeta(r);
                const thumb = resolveAdminImageSrc(meta.image);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.buyer_name?.trim() || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.buyer_email ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden border border-[rgba(30,21,23,0.12)] bg-[rgba(30,21,23,0.04)]">
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate">{meta.title}</div>
                          {meta.artist ? (
                            <div className="truncate text-xs text-muted-foreground">{meta.artist}</div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">U$D {fmtMoney(Number(r.amount_usd))}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isPurchasePaid(r.payment_status)
                            ? "admin-status admin-status--filled"
                            : "admin-status admin-status--muted"
                        }
                      >
                        {adminPaymentLabel(r.payment_status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          r.shipping_status === "delivered"
                            ? "admin-status admin-status--filled"
                            : r.shipping_status === "shipped"
                              ? "admin-status"
                              : "admin-status admin-status--muted"
                        }
                      >
                        {adminShippingLabel(r.shipping_status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setDetail(r)}>
                          Ver
                        </Button>
                        {next ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={updateShipping.isPending}
                            onClick={() => advance(r)}
                          >
                            {actionLabel(next)}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg border-bridge-black/20">
          <DialogHeader>
            <DialogTitle>Pedido #{detail?.id}</DialogTitle>
            <DialogDescription>Detalle del pago y del envío.</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <DetailRow label="Comprador" value={detail.buyer_name ?? "—"} />
              <DetailRow label="Email" value={detail.buyer_email ?? "—"} />
              <DetailRow label="Dirección" value={detail.shipping_address ?? "—"} />
              <DetailRow
                label="Obra"
                value={artworkMeta(detail).title}
                href={`/admin/obras?edit=${detail.artwork_id}`}
              />
              <DetailRow
                label="Artista"
                value={artworkMeta(detail).artist ?? "—"}
              />
              <DetailRow label="Monto" value={`U$D ${fmtMoney(Number(detail.amount_usd))} ${detail.currency ?? "USD"}`} />
              <DetailRow label="Pago" value={adminPaymentLabel(detail.payment_status)} />
              <DetailRow label="Envío" value={adminShippingLabel(detail.shipping_status)} />
              <DetailRow label="Stripe session" value={detail.stripe_session_id} />
              <DetailRow label="Payment intent" value={detail.stripe_payment_intent_id ?? "—"} />
              <DetailRow label="Fecha" value={fmtDate(detail.created_at)} />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
            {detail && nextShippingStatus(detail.shipping_status) ? (
              <Button
                type="button"
                disabled={updateShipping.isPending}
                onClick={() => advance(detail)}
              >
                {actionLabel(nextShippingStatus(detail.shipping_status)!)}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function artworkMeta(row: AdminPurchaseRow): { title: string; artist: string | null; image: string | null } {
  const art = row.artworks && typeof row.artworks === "object" ? row.artworks : null;
  const title = art && "title" in art ? String(art.title) : `#${row.artwork_id}`;
  const artist =
    art && art.artists && typeof art.artists === "object" && "name" in art.artists
      ? String(art.artists.name)
      : null;
  const image = art && "image_url" in art && art.image_url ? String(art.image_url) : null;
  return { title, artist, image };
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-[rgba(30,21,23,0.1)] py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="break-words">
        {href ? (
          <Link to={href} className="underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
            {value}
          </Link>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function actionLabel(status: AdminShippingStatus): string {
  switch (status) {
    case "preparing":
      return "Marcar preparando";
    case "shipped":
      return "Marcar enviado";
    case "delivered":
      return "Marcar entregado";
    default:
      return "Actualizar";
  }
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

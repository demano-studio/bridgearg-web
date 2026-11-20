import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabaseClient";
import { tradeAdmin, type TradeApplicationAdminRow } from "@/lib/api";
import type { AdminArtworkRow, AdminShippingStatus } from "@/features/admin/types";
import { adminMessageStatusLabel, adminShippingLabel } from "@/features/admin/adminUtils";

type WorkRow = Pick<
  AdminArtworkRow,
  | "id"
  | "title"
  | "image_url"
  | "price_usd"
  | "price_ref_usd"
  | "status"
  | "lote_id"
  | "artist_id"
  | "artists"
  | "fecha_venta"
>;

type PendingItem = {
  id: string;
  kind: string;
  title: string;
  meta: string;
  href: string;
  rank: number;
};

const PENDING_CAP = 12;

export default function ResumenPage() {
  const { data: rows = [], isLoading: loadingWorks } = useQuery({
    queryKey: ["admin", "resumen", "artworks"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artworks")
        .select("id,title,image_url,price_usd,price_ref_usd,status,lote_id,artist_id,fecha_venta,artists(name)")
        .is("deleted_at", null)
        .order("id");
      if (error) throw new Error(error.message);
      return (data ?? []) as WorkRow[];
    },
  });

  const { data: lotes = [] } = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("lotes").select("id,nombre").is("deleted_at", null).order("id");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: number; nombre: string }[];
    },
  });

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["admin", "resumen", "purchases"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("purchases")
        .select("id,artwork_id,buyer_name,buyer_email,amount_usd,payment_status,shipping_status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as {
        id: number;
        artwork_id: number;
        buyer_name: string | null;
        buyer_email: string | null;
        amount_usd: number;
        payment_status: string;
        shipping_status: AdminShippingStatus;
        created_at: string;
      }[];
    },
  });

  const { data: tradePending = [], isLoading: loadingTrade } = useQuery({
    queryKey: ["admin", "resumen", "trade-pending"],
    queryFn: async () => {
      const result = await tradeAdmin("list", { status: "pending" });
      return (result.applications ?? []) as TradeApplicationAdminRow[];
    },
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["admin", "resumen", "messages"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("contact_messages")
        .select("id,full_name,email,subject,status,created_at")
        .neq("status", "responded")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as {
        id: number;
        full_name: string;
        email: string;
        subject: string;
        status: string;
        created_at: string;
      }[];
    },
  });

  const openPurchases = React.useMemo(
    () => purchases.filter((p) => p.shipping_status !== "delivered"),
    [purchases],
  );

  const kpis = React.useMemo(() => {
    let stock = 0;
    let reserved = 0;
    let sold = 0;
    let valorPub = 0;
    let totalSoldUsd = 0;
    let sinFoto = 0;
    let sinLote = 0;
    for (const r of rows) {
      if (r.status === "available") {
        stock += 1;
        valorPub += r.price_usd != null ? Number(r.price_usd) : 0;
      } else if (r.status === "reserved") {
        reserved += 1;
      } else if (r.status === "sold") {
        sold += 1;
        totalSoldUsd += r.price_usd != null ? Number(r.price_usd) : 0;
      }
      if (!r.image_url?.trim()) sinFoto += 1;
      if (r.lote_id == null) sinLote += 1;
    }
    return {
      stock,
      reserved,
      sold,
      totalSoldUsd,
      valorPub,
      pedidosPendientes: openPurchases.length,
      mensajesSinResponder: messages.length,
      tradePending: tradePending.length,
      sinFoto,
      sinLote,
      total: rows.length,
      ref: rows.reduce((n, r) => n + (r.price_ref_usd != null ? Number(r.price_ref_usd) : 0), 0),
      pub: rows.reduce((n, r) => n + (r.price_usd != null ? Number(r.price_usd) : 0), 0),
    };
  }, [rows, openPurchases, messages, tradePending]);

  const salesByArtist = React.useMemo(() => {
    const m = new Map<string, { n: number; usd: number }>();
    for (const r of rows) {
      if (r.status !== "sold") continue;
      const name =
        r.artists && typeof r.artists === "object" && "name" in r.artists
          ? String((r.artists as { name: string }).name)
          : "—";
      const cur = m.get(name) ?? { n: 0, usd: 0 };
      cur.n += 1;
      cur.usd += r.price_usd != null ? Number(r.price_usd) : 0;
      m.set(name, cur);
    }
    return Array.from(m.entries())
      .map(([artist, v]) => ({ artist, ...v }))
      .sort((a, b) => b.usd - a.usd || a.artist.localeCompare(b.artist, "es"));
  }, [rows]);

  const salesByMonth = React.useMemo(() => {
    const m = new Map<string, { n: number; usd: number; label: string }>();
    for (const r of rows) {
      if (r.status !== "sold") continue;
      const raw = r.fecha_venta?.trim();
      if (!raw) continue;
      const key = raw.slice(0, 7); // YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(key)) continue;
      const [y, mo] = key.split("-");
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });
      const cur = m.get(key) ?? { n: 0, usd: 0, label };
      cur.n += 1;
      cur.usd += r.price_usd != null ? Number(r.price_usd) : 0;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [rows]);

  const pendientes = React.useMemo(() => {
    const items: PendingItem[] = [];

    for (const t of tradePending) {
      items.push({
        id: `trade-${t.id}`,
        kind: "Trade",
        title: t.full_name || t.email,
        meta: [t.company, t.email].filter(Boolean).join(" · ") || "Solicitud pendiente de revisión",
        href: "/admin/trade",
        rank: 1,
      });
    }

    for (const p of openPurchases) {
      items.push({
        id: `purchase-${p.id}`,
        kind: "Pedido",
        title: p.buyer_name?.trim() || p.buyer_email || `Pedido #${p.id}`,
        meta: `U$D ${fmt(Number(p.amount_usd))} · ${adminShippingLabel(p.shipping_status)}`,
        href: `/admin/pedidos?id=${p.id}`,
        rank: 2,
      });
    }

    for (const m of messages) {
      items.push({
        id: `msg-${m.id}`,
        kind: "Mensaje",
        title: m.subject?.trim() || m.full_name || m.email,
        meta: `${m.full_name || m.email} · ${adminMessageStatusLabel(m.status)}`,
        href: `/admin/mensajes?id=${m.id}`,
        rank: 3,
      });
    }

    if (kpis.sinLote > 0) {
      items.push({
        id: "obras-sin-lote",
        kind: "Catálogo",
        title: `${kpis.sinLote} obra(s) sin lote`,
        meta: "Asigná un lote para filtrarlas en el panel",
        href: "/admin/obras?lote=__none",
        rank: 4,
      });
    }

    if (kpis.sinFoto > 0) {
      items.push({
        id: "obras-sin-foto",
        kind: "Catálogo",
        title: `${kpis.sinFoto} obra(s) sin foto`,
        meta: "Completá la imagen principal antes de publicar",
        href: "/admin/obras",
        rank: 5,
      });
    }

    items.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, "es"));
    return items;
  }, [tradePending, openPurchases, messages, kpis.sinLote, kpis.sinFoto]);

  const visiblePendientes = pendientes.slice(0, PENDING_CAP);
  const hiddenPendientes = Math.max(0, pendientes.length - visiblePendientes.length);

  const byLote = React.useMemo(() => {
    const m = new Map<number | null, { nombre: string; works: WorkRow[] }>();
    const loteName = (id: number | null) => {
      if (id == null) return "Sin lote";
      return lotes.find((l) => l.id === id)?.nombre ?? `Lote #${id}`;
    };
    for (const r of rows) {
      const lid = r.lote_id ?? null;
      const cur = m.get(lid) ?? { nombre: loteName(lid), works: [] };
      cur.works.push(r);
      m.set(lid, cur);
    }
    return Array.from(m.entries())
      .map(([loteId, v]) => {
        const byArtist = new Map<string, { ref: number; pub: number; n: number }>();
        for (const w of v.works) {
          const an =
            w.artists && typeof w.artists === "object" && "name" in w.artists
              ? String((w.artists as { name: string }).name)
              : "—";
          const cur = byArtist.get(an) ?? { ref: 0, pub: 0, n: 0 };
          cur.ref += w.price_ref_usd != null ? Number(w.price_ref_usd) : 0;
          cur.pub += w.price_usd != null ? Number(w.price_usd) : 0;
          cur.n += 1;
          byArtist.set(an, cur);
        }
        return {
          loteId,
          nombre: v.nombre,
          total: v.works.length,
          byArtist: Array.from(byArtist.entries()).sort((a, b) => a[0].localeCompare(b[0], "es")),
        };
      })
      .sort((a, b) => {
        if (a.loteId == null) return -1;
        if (b.loteId == null) return 1;
        return a.nombre.localeCompare(b.nombre, "es");
      });
  }, [rows, lotes]);

  const loading = loadingWorks || loadingPurchases || loadingTrade || loadingMessages;

  if (loading) return <p className="text-sm text-muted-foreground">Cargando resumen…</p>;

  return (
    <div className="admin-resumen space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground">Operación del día y pulso del catálogo.</p>
      </div>

      <section className="admin-kpi-grid" aria-label="Indicadores">
        <Kpi
          label="Obras en stock"
          value={String(kpis.stock)}
          hint={`${kpis.total} en catálogo · ${kpis.sold} vendidas`}
          href="/admin/obras"
        />
        <Kpi
          label="Valor publicado"
          value={`U$D ${fmt(kpis.valorPub)}`}
          hint="Solo obras en stock"
          href="/admin/obras"
        />
        <Kpi
          label="Pedidos pendientes"
          value={String(kpis.pedidosPendientes)}
          hint={
            kpis.pedidosPendientes === 0
              ? "Sin compras Stripe por despachar"
              : kpis.tradePending > 0
                ? `${kpis.tradePending} trade pendiente(s) también`
                : "Pagados, sin entregar"
          }
          href="/admin/pedidos"
        />
        <Kpi
          label="Mensajes sin responder"
          value={String(kpis.mensajesSinResponder)}
          hint={kpis.mensajesSinResponder === 0 ? "Inbox al día" : "Nuevos o leídos sin respuesta"}
          href="/admin/mensajes"
        />
      </section>

      <section className="space-y-6" aria-label="Ventas">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ventas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conteos del catálogo y total vendido (precio publicado).
          </p>
        </div>

        <div className="admin-kpi-grid" aria-label="Indicadores de ventas">
          <Kpi label="Stock" value={String(kpis.stock)} hint="Disponibles" href="/admin/obras" />
          <Kpi label="Reservadas" value={String(kpis.reserved)} hint="En reserva" href="/admin/obras" />
          <Kpi label="Vendidas" value={String(kpis.sold)} hint="Marcadas sold" href="/admin/obras" />
          <Kpi
            label="Total U$D vendido"
            value={`U$D ${fmt(kpis.totalSoldUsd)}`}
            hint="Suma price_usd de vendidas"
            href="/admin/obras"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Vendido por artista</h3>
            {salesByArtist.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay obras vendidas.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4">Artista</th>
                      <th className="py-2 pr-4">Obras</th>
                      <th className="py-2">U$D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByArtist.map((row) => (
                      <tr key={row.artist}>
                        <td className="py-2 pr-4">{row.artist}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.n}</td>
                        <td className="py-2 tabular-nums">{fmt(row.usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Vendido por mes</h3>
            {salesByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin ventas con fecha_venta cargada todavía.
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4">Mes</th>
                      <th className="py-2 pr-4">Obras</th>
                      <th className="py-2">U$D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByMonth.map((row) => (
                      <tr key={row.key}>
                        <td className="py-2 pr-4 capitalize">{row.label}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.n}</td>
                        <td className="py-2 tabular-nums">{fmt(row.usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="admin-pending" aria-label="Pendientes de hoy">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pendientes de hoy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trade, pedidos, mensajes y alertas de catálogo.
            </p>
          </div>
          <span className="admin-pending__count">{pendientes.length}</span>
        </div>

        {pendientes.length === 0 ? (
          <p className="border-t border-[rgba(30,21,23,0.14)] py-6 text-sm text-muted-foreground">
            Nada pendiente por ahora.
          </p>
        ) : (
          <>
            <ul className="admin-pending__list">
              {visiblePendientes.map((item) => (
                <li key={item.id}>
                  <Link to={item.href} className="admin-pending__row">
                    <span className="admin-pending__kind">{item.kind}</span>
                    <span className="admin-pending__body">
                      <span className="admin-pending__title">{item.title}</span>
                      <span className="admin-pending__meta">{item.meta}</span>
                    </span>
                    <span className="admin-pending__go" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {hiddenPendientes > 0 ? (
              <p className="pt-3 text-sm text-muted-foreground">
                +{hiddenPendientes} más ·{" "}
                <Link to="/admin/pedidos" className="underline-offset-2 hover:underline">
                  Pedidos
                </Link>
                {" · "}
                <Link to="/admin/mensajes" className="underline-offset-2 hover:underline">
                  Mensajes
                </Link>
                {" · "}
                <Link to="/admin/trade" className="underline-offset-2 hover:underline">
                  Trade
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Catálogo por lote</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Totales del inventario · ref. U$D {fmt(kpis.ref)} · pub. U$D {fmt(kpis.pub)}
          </p>
        </div>
        {byLote.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay obras en el catálogo.</p>
        ) : (
          byLote.map(({ loteId, nombre, total, byArtist }) => (
            <div key={loteId ?? "none"} className="admin-lote-block">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {loteId == null ? (
                    <Link to="/admin/obras?lote=__none" className="hover:underline">
                      {nombre}
                    </Link>
                  ) : (
                    <Link to={`/admin/lotes/${loteId}`} className="hover:underline">
                      {nombre}
                    </Link>
                  )}
                </h3>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {total} obra{total === 1 ? "" : "s"}
                </span>
              </div>
              <div className="admin-table-wrap">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4">Artista</th>
                      <th className="py-2 pr-4">Obras</th>
                      <th className="py-2 pr-4">Val. ref.</th>
                      <th className="py-2">Val. pub.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byArtist.map(([artistName, v]) => (
                      <tr key={artistName}>
                        <td className="py-2 pr-4">{artistName}</td>
                        <td className="py-2 pr-4 tabular-nums">{v.n}</td>
                        <td className="py-2 pr-4 tabular-nums">{fmt(v.ref)}</td>
                        <td className="py-2 tabular-nums">{fmt(v.pub)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link to={href} className="admin-kpi admin-kpi--link">
      <div className="admin-kpi__label">{label}</div>
      <div className="admin-kpi__value">{value}</div>
      {hint ? <div className="admin-kpi__hint">{hint}</div> : null}
    </Link>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

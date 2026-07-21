import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabaseClient";
import type { AdminArtworkRow } from "@/features/admin/types";

type WorkRow = Pick<AdminArtworkRow, "id" | "price_usd" | "price_ref_usd" | "status" | "lote_id" | "artist_id" | "artists">;

export default function ResumenPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "resumen", "artworks"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artworks")
        .select("id,price_usd,price_ref_usd,status,lote_id,artist_id,artists(name)")
        .order("id");
      if (error) throw new Error(error.message);
      return (data ?? []) as WorkRow[];
    },
  });

  const { data: lotes = [] } = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("lotes").select("id,nombre").order("id");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: number; nombre: string }[];
    },
  });

  const global = React.useMemo(() => {
    let ref = 0;
    let pub = 0;
    let sold = 0;
    for (const r of rows) {
      ref += r.price_ref_usd != null ? Number(r.price_ref_usd) : 0;
      pub += r.price_usd != null ? Number(r.price_usd) : 0;
      if (r.status === "sold") sold += 1;
    }
    return { total: rows.length, ref, pub, sold };
  }, [rows]);

  const byLote = React.useMemo(() => {
    const m = new Map<number | null, { nombre: string; works: WorkRow[] }>();
    const loteName = (id: number | null) => {
      if (id == null) return "Sin lote";
      return lotes.find((l) => l.id === id)?.nombre ?? `Lote #${id}`;
    };
    for (const r of rows) {
      const lid = r.lote_id ?? null;
      const name = loteName(lid);
      const cur = m.get(lid) ?? { nombre: name, works: [] };
      cur.works.push(r);
      m.set(lid, cur);
    }
    return Array.from(m.entries()).map(([loteId, v]) => {
      const byArtist = new Map<string, { ref: number; pub: number; n: number }>();
      for (const w of v.works) {
        const an = w.artists && typeof w.artists === "object" && "name" in w.artists ? String((w.artists as { name: string }).name) : "—";
        const cur = byArtist.get(an) ?? { ref: 0, pub: 0, n: 0 };
        cur.ref += w.price_ref_usd != null ? Number(w.price_ref_usd) : 0;
        cur.pub += w.price_usd != null ? Number(w.price_usd) : 0;
        cur.n += 1;
        byArtist.set(an, cur);
      }
      return { loteId, nombre: v.nombre, byArtist: Array.from(byArtist.entries()) };
    });
  }, [rows, lotes]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando resumen…</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-muted-foreground">Totales globales y desglose por lote y artista.</p>
      </div>

      <section className="border border-bridge-black/15 bg-bridge-cream/30 p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Global</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Obras" value={String(global.total)} />
          <Stat label="Total val. referencia U$D" value={fmt(global.ref)} />
          <Stat label="Total val. publicado U$D" value={fmt(global.pub)} />
          <Stat label="Vendidas" value={String(global.sold)} />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Por lote</h2>
        {byLote.map(({ loteId, nombre, byArtist }) => (
          <div key={loteId ?? "none"} className="border border-bridge-black/15 bg-[#faf9ef] p-5">
            <h3 className="mb-3 font-semibold">{nombre}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-bridge-black/15 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Artista</th>
                    <th className="py-2 pr-4">Obras</th>
                    <th className="py-2 pr-4">Val. ref.</th>
                    <th className="py-2">Val. pub.</th>
                  </tr>
                </thead>
                <tbody>
                  {byArtist.map(([artistName, v]) => (
                    <tr key={artistName} className="border-b border-bridge-black/10">
                      <td className="py-2 pr-4">{artistName}</td>
                      <td className="py-2 pr-4">{v.n}</td>
                      <td className="py-2 pr-4">{fmt(v.ref)}</td>
                      <td className="py-2">{fmt(v.pub)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

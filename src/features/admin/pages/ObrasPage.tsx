import * as React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { AdminArtworkRow } from "@/features/admin/types";
import { adminArtworkStatusLabel } from "@/features/admin/adminUtils";
import { ObraModal } from "@/features/admin/components/ObraModal";
import { ObraReadOnlyModal } from "@/features/admin/components/ObraReadOnlyModal";

const selectArtworks =
  "id,title,image_url,status,price_usd,price_ref_usd,ubicacion,estado_pago,comprador,fecha_venta,certificado,notas,es_conjunto,piezas,lote_id,dimensions,weight_kg,width_cm,height_cm,depth_cm,artist_id,year,medium,tipo,enmarque,materiales,extra_image_paths,artists(id,name,slug)";

export default function ObrasPage() {
  const qc = useQueryClient();
  const { id: loteRouteId } = useParams<{ id?: string }>();
  const loteFilter = loteRouteId && /^\d+$/.test(loteRouteId) ? loteRouteId : "";
  const initialLoteIdForModal = loteFilter ? Number(loteFilter) : null;

  const [searchParams, setSearchParams] = useSearchParams();
  const artistFilter = searchParams.get("artistId") ?? "";
  const [tipo, setTipo] = React.useState<string>("__all");
  const [status, setStatus] = React.useState<string>("__all");
  const [ubicacion, setUbicacion] = React.useState<string>("__all");
  const [q, setQ] = React.useState("");

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [readRow, setReadRow] = React.useState<AdminArtworkRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminArtworkRow | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "artworks", "full"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("artworks").select(selectArtworks).order("id", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminArtworkRow[];
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["admin", "artists", "short"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("artists").select("id,name").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: number; name: string }[];
    },
  });

  const { data: loteMeta } = useQuery({
    queryKey: ["admin", "lote", loteFilter],
    enabled: Boolean(loteFilter),
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("lotes").select("id,nombre,fecha").eq("id", Number(loteFilter)).single();
      if (error) throw new Error(error.message);
      return data as { id: number; nombre: string; fecha: string | null };
    },
  });

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (loteFilter && String(r.lote_id ?? "") !== loteFilter) return false;
      if (artistFilter && String(r.artist_id) !== artistFilter) return false;
      if (tipo !== "__all" && (r.tipo ?? "") !== tipo) return false;
      if (status !== "__all" && r.status !== status) return false;
      if (ubicacion !== "__all" && (r.ubicacion ?? "") !== ubicacion) return false;
      if (q.trim()) {
        const n = q.trim().toLowerCase();
        const title = r.title.toLowerCase();
        const an = (r.artists?.name ?? "").toLowerCase();
        if (!title.includes(n) && !an.includes(n)) return false;
      }
      return true;
    });
  }, [rows, loteFilter, artistFilter, tipo, status, ubicacion, q]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await adminWrite("artwork.delete", { id: deleteTarget.id });
      toast({ title: "Obra eliminada" });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      if (loteFilter) void qc.invalidateQueries({ queryKey: ["admin", "lote", loteFilter] });
      setDeleteTarget(null);
    } catch (e) {
      toast({
        title: "Error al eliminar",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {loteFilter ? (loteMeta?.nombre ? `Obras — ${loteMeta.nombre}` : "Obras del lote") : "Obras"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loteFilter
              ? loteMeta?.fecha
                ? `Filtradas por lote #${loteFilter} · ${loteMeta.fecha}`
                : `Filtradas por lote #${loteFilter}.`
              : "Catálogo completo y CRM."}
          </p>
        </div>
        <Button
          type="button"
          className="rounded-none"
          onClick={() => {
            setEditingId(null);
            setEditorOpen(true);
          }}
        >
          Nueva obra
        </Button>
      </div>

      <div className="grid gap-4 border border-bridge-black/15 bg-bridge-cream/30 p-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Artista</Label>
          <Select
            value={artistFilter || "__all"}
            onValueChange={(v) => {
              if (v === "__all") {
                searchParams.delete("artistId");
              } else {
                searchParams.set("artistId", v);
              }
              setSearchParams(searchParams, { replace: true });
            }}
          >
            <SelectTrigger className="rounded-none border-bridge-black/20">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="__all">Todos</SelectItem>
              {artists.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-none border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="Cuadro">Cuadro</SelectItem>
              <SelectItem value="Escultura">Escultura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-none border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="available">Stock</SelectItem>
              <SelectItem value="sold">Vendida</SelectItem>
              <SelectItem value="reserved">Reservada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Ubicación</Label>
          <Select value={ubicacion} onValueChange={setUbicacion}>
            <SelectTrigger className="rounded-none border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="__all">Todas</SelectItem>
              <SelectItem value="En Galería">En Galería</SelectItem>
              <SelectItem value="En Tránsito">En Tránsito</SelectItem>
              <SelectItem value="Entregada">Entregada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 lg:col-span-1">
          <Label className="text-[10px] uppercase tracking-wider">Buscar</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título o artista…"
            className="rounded-none border-bridge-black/20"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-bridge-black/15 bg-[#faf9ef]">
        <Table>
          <TableHeader>
            <TableRow className="border-bridge-black/15 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider">Obra</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Artista</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Dimensiones</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Peso</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Val. ref.</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Val. pub.</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Ubicación</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Pago</TableHead>
              <TableHead className="w-[100px] text-[10px] uppercase tracking-wider" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  No hay obras con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-bridge-black/10">
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => setReadRow(r)}
                    >
                      {r.title}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{r.artists?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.tipo ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm">{r.dimensions ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.weight_kg != null ? `${r.weight_kg}` : "—"}</TableCell>
                  <TableCell className="text-sm">{r.price_ref_usd != null ? `U$D ${r.price_ref_usd}` : "—"}</TableCell>
                  <TableCell className="text-sm">{r.price_usd != null ? `U$D ${r.price_usd}` : "—"}</TableCell>
                  <TableCell className="text-sm">{adminArtworkStatusLabel(r.status)}</TableCell>
                  <TableCell className="text-sm">{r.ubicacion ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.estado_pago ?? "—"}</TableCell>
                  <TableCell className="space-x-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-none"
                      onClick={() => {
                        setEditingId(r.id);
                        setEditorOpen(true);
                      }}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-none text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(r)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ObraModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        artworkId={editingId}
        initialLoteId={editingId == null ? initialLoteIdForModal : null}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
          void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
          if (loteFilter) void qc.invalidateQueries({ queryKey: ["admin", "lote", loteFilter] });
        }}
      />

      <ObraReadOnlyModal row={readRow} open={!!readRow} onOpenChange={(o) => !o && setReadRow(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar obra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={() => void confirmDelete()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

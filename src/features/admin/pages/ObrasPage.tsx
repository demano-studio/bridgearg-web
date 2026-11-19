import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { csvStamp, downloadCsv } from "@/features/admin/csv";
import { ObraModal } from "@/features/admin/components/ObraModal";
import { ObraReadOnlyModal } from "@/features/admin/components/ObraReadOnlyModal";
import { ObrasGallery } from "@/features/admin/components/ObrasGallery";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";

const selectArtworks =
  "id,title,image_url,status,price_usd,price_ref_usd,ubicacion,estado_pago,comprador,comprador_contacto,fecha_venta,certificado,notas,es_conjunto,piezas,lote_id,dimensions,weight_kg,width_cm,height_cm,depth_cm,artist_id,year,medium,tipo,enmarque,materiales,extra_image_paths,artists(id,name,slug)";

type ObrasView = "lista" | "galeria";

const OBRAS_VIEW_STORAGE_KEY = "bridgearg.admin.obras.view";

function parseObrasView(raw: string | null | undefined): ObrasView {
  return raw === "galeria" ? "galeria" : "lista";
}

function readStoredObrasView(): ObrasView {
  try {
    return parseObrasView(localStorage.getItem(OBRAS_VIEW_STORAGE_KEY));
  } catch {
    return "lista";
  }
}

export default function ObrasPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useAdminAccess();
  const canEditObras = access.canEdit("obras");
  const canEditLotes = access.canEdit("lotes");
  const { id: loteRouteId } = useParams<{ id?: string }>();
  const loteFilter = loteRouteId && /^\d+$/.test(loteRouteId) ? loteRouteId : "";
  const initialLoteIdForModal = loteFilter ? Number(loteFilter) : null;

  const [searchParams, setSearchParams] = useSearchParams();
  const artistFilter = searchParams.get("artistId") ?? "";
  const editParam = searchParams.get("edit");
  const viewParam = searchParams.get("view");
  const view = parseObrasView(viewParam ?? readStoredObrasView());
  const isGaleria = view === "galeria";
  const [tipo, setTipo] = React.useState<string>("__all");
  const [status, setStatus] = React.useState<string>("__all");
  const [ubicacion, setUbicacion] = React.useState<string>("__all");
  const [q, setQ] = React.useState("");

  function setView(next: ObrasView) {
    try {
      localStorage.setItem(OBRAS_VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    const params = new URLSearchParams(searchParams);
    if (next === "lista") params.delete("view");
    else params.set("view", "galeria");
    setSearchParams(params, { replace: true });
  }

  // Keep ?view= in sync when restoring from localStorage (e.g. sidebar → /admin/obras).
  React.useEffect(() => {
    if (viewParam != null) {
      try {
        localStorage.setItem(OBRAS_VIEW_STORAGE_KEY, parseObrasView(viewParam));
      } catch {
        /* ignore */
      }
      return;
    }
    if (view === "galeria") {
      const params = new URLSearchParams(searchParams);
      params.set("view", "galeria");
      setSearchParams(params, { replace: true });
    }
  }, [viewParam, view, searchParams, setSearchParams]);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [readRow, setReadRow] = React.useState<AdminArtworkRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminArtworkRow | null>(null);
  const [assigningLote, setAssigningLote] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const [bulkLoteTarget, setBulkLoteTarget] = React.useState<string>("");
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [deleteLoteOpen, setDeleteLoteOpen] = React.useState(false);
  const [loteBusy, setLoteBusy] = React.useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "artworks", "full"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artworks")
        .select(selectArtworks)
        .is("deleted_at", null)
        .order("id", { ascending: true });
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

  const { data: lotes = [] } = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id,nombre,fecha")
        .is("deleted_at", null)
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: number; nombre: string; fecha: string | null }[];
    },
  });

  const { data: loteMeta } = useQuery({
    queryKey: ["admin", "lote", loteFilter],
    enabled: Boolean(loteFilter),
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id,nombre,fecha")
        .eq("id", Number(loteFilter))
        .is("deleted_at", null)
        .single();
      if (error) throw new Error(error.message);
      return data as { id: number; nombre: string; fecha: string | null };
    },
  });

  /** When browsing all obras (not a lote route), optional lote filter via ?lote= */
  const loteQueryFilter = loteFilter ? "" : (searchParams.get("lote") ?? "");

  const unassignedCount = React.useMemo(
    () => rows.reduce((n, r) => (r.lote_id == null ? n + 1 : n), 0),
    [rows],
  );

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (loteFilter && String(r.lote_id ?? "") !== loteFilter) return false;
      if (!loteFilter && loteQueryFilter === "__none" && r.lote_id != null) return false;
      if (!loteFilter && loteQueryFilter && loteQueryFilter !== "__none" && String(r.lote_id ?? "") !== loteQueryFilter) {
        return false;
      }
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
  }, [rows, loteFilter, loteQueryFilter, artistFilter, tipo, status, ubicacion, q]);

  React.useEffect(() => {
    setSelectedIds(new Set());
    setBulkLoteTarget("");
  }, [loteFilter, loteQueryFilter, artistFilter, tipo, status, ubicacion, q]);

  React.useEffect(() => {
    if (!editParam || !/^\d+$/.test(editParam)) return;
    const id = Number(editParam);
    setEditingId(id);
    setEditorOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }, [editParam, searchParams, setSearchParams]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected = filtered.some((r) => selectedIds.has(r.id));

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const r of filtered) next.add(r.id);
      } else {
        for (const r of filtered) next.delete(r.id);
      }
      return next;
    });
  }

  function toggleSelectOne(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function assignSelectedToLote() {
    if (selectedIds.size === 0 || !bulkLoteTarget) return;
    const loteId = bulkLoteTarget === "__none" ? null : Number(bulkLoteTarget);
    if (bulkLoteTarget !== "__none" && (!Number.isFinite(loteId) || (loteId as number) < 1)) return;
    setAssigningLote(true);
    try {
      const result = (await adminWrite("artwork.assignLote", {
        lote_id: loteId,
        ids: Array.from(selectedIds),
      })) as { updated?: number };
      const targetName =
        bulkLoteTarget === "__none"
          ? "Sin lote"
          : lotes.find((l) => l.id === loteId)?.nombre ?? `lote #${loteId}`;
      toast({
        title: "Lote actualizado",
        description: `${result?.updated ?? 0} obra(s) → ${targetName}.`,
      });
      setSelectedIds(new Set());
      setBulkLoteTarget("");
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
      if (loteFilter) void qc.invalidateQueries({ queryKey: ["admin", "lote", loteFilter] });
    } catch (e) {
      toast({
        title: "No se pudo asignar el lote",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setAssigningLote(false);
    }
  }

  async function saveRenameLote() {
    if (!loteFilter) return;
    const nombre = renameValue.trim();
    if (!nombre) {
      toast({ title: "El nombre no puede quedar vacío", variant: "destructive" });
      return;
    }
    setLoteBusy(true);
    try {
      await adminWrite("lote.update", { id: Number(loteFilter), nombre });
      toast({ title: "Lote renombrado", description: nombre });
      setRenameOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin", "lotes"] });
      void qc.invalidateQueries({ queryKey: ["admin", "lote", loteFilter] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
    } catch (e) {
      toast({
        title: "No se pudo renombrar",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setLoteBusy(false);
    }
  }

  async function confirmDeleteLote() {
    if (!loteFilter) return;
    setLoteBusy(true);
    try {
      const result = (await adminWrite("lote.delete", { id: Number(loteFilter) })) as {
        artworks_unassigned?: number;
        deleted?: { nombre?: string };
      };
      toast({
        title: "Lote enviado a la Papelera",
        description: `${result?.deleted?.nombre ?? "Lote"} · ${result?.artworks_unassigned ?? 0} obra(s) quedaron sin lote.`,
      });
      setDeleteLoteOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin", "lotes"] });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      void qc.invalidateQueries({ queryKey: ["admin", "papelera"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      navigate("/admin/obras");
    } catch (e) {
      toast({
        title: "No se pudo eliminar el lote",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setLoteBusy(false);
    }
  }

  async function assignUnassignedToCurrentLote() {
    if (!loteFilter) return;
    const loteId = Number(loteFilter);
    if (!Number.isFinite(loteId) || loteId < 1) return;
    setAssigningLote(true);
    try {
      const result = (await adminWrite("artwork.assignLote", {
        lote_id: loteId,
        only_unassigned: true,
      })) as { updated?: number };
      toast({
        title: "Obras asignadas al lote",
        description: `${result?.updated ?? 0} obra(s) sin lote pasaron a ${loteMeta?.nombre ?? `lote #${loteId}`}.`,
      });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "lote", loteFilter] });
    } catch (e) {
      toast({
        title: "No se pudo asignar el lote",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setAssigningLote(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await adminWrite("artwork.delete", { id: deleteTarget.id });
      toast({ title: "Obra enviada a la Papelera" });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      void qc.invalidateQueries({ queryKey: ["admin", "papelera"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
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

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: "Nada para exportar", description: "No hay obras con el filtro actual." });
      return;
    }
    const loteName = (id: number | null) => {
      if (id == null) return "";
      return lotes.find((l) => l.id === id)?.nombre ?? String(id);
    };
    downloadCsv(
      `obras-${csvStamp()}.csv`,
      [
        "ID",
        "Obra",
        "Artista",
        "Tipo",
        "Año",
        "Técnica",
        "Lote",
        "Precio Referencia (USD)",
        "Precio Publicado (USD)",
        "Estado",
        "Ubicación",
        "Estado de Pago",
        "Comprador",
        "Fecha de Venta",
      ],
      filtered.map((r) => [
        r.id,
        r.title,
        r.artists?.name ?? "",
        r.tipo,
        r.year,
        r.medium,
        loteName(r.lote_id),
        r.price_ref_usd,
        r.price_usd,
        adminArtworkStatusLabel(r.status),
        r.ubicacion,
        r.estado_pago,
        r.comprador,
        r.fecha_venta,
      ]),
    );
    toast({ title: "CSV descargado", description: `${filtered.length} obra(s)` });
  }

  const viewToggle = (
    <div className="admin-view-toggle" role="group" aria-label="Vista de obras">
      <button
        type="button"
        className={`admin-view-toggle__btn${view === "lista" ? " is-active" : ""}`}
        aria-pressed={view === "lista"}
        onClick={() => setView("lista")}
      >
        Lista
      </button>
      <button
        type="button"
        className={`admin-view-toggle__btn${view === "galeria" ? " is-active" : ""}`}
        aria-pressed={view === "galeria"}
        onClick={() => setView("galeria")}
      >
        Galería
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="admin-obras-page__header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {loteFilter ? (loteMeta?.nombre ? `Obras — ${loteMeta.nombre}` : "Obras del lote") : "Obras"}
            </h1>
            <div className="sm:hidden">{viewToggle}</div>
          </div>
          <p className="text-sm text-muted-foreground">
            {loteFilter
              ? loteMeta?.fecha
                ? `Filtradas por lote #${loteFilter} · ${loteMeta.fecha}`
                : `Filtradas por lote #${loteFilter}.`
              : "Catálogo completo y CRM."}
            {` · ${filtered.length} visible${filtered.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="admin-obras-page__header-actions flex flex-wrap items-center gap-2">
          <div className="hidden sm:block">{viewToggle}</div>
          {canEditObras ? (
            <Button type="button" variant="outline" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          ) : null}
          {loteFilter && canEditLotes ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameValue(loteMeta?.nombre ?? "");
                  setRenameOpen(true);
                }}
              >
                Renombrar lote
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteLoteOpen(true)}>
                Eliminar lote
              </Button>
            </>
          ) : null}
          {canEditObras ? (
            <Button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditorOpen(true);
              }}
            >
              Nueva obra
            </Button>
          ) : null}
        </div>
      </div>

      {loteFilter && unassignedCount > 0 && canEditObras ? (
        <div className="admin-callout">
          <p className="text-sm text-muted-foreground">
            Hay <strong className="text-foreground">{unassignedCount}</strong> obra(s) sin lote. Podés asignarlas a este
            lote.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={assigningLote}
            onClick={() => void assignUnassignedToCurrentLote()}
          >
            {assigningLote ? "Asignando…" : `Asignar ${unassignedCount} sin lote a este lote`}
          </Button>
        </div>
      ) : null}

      <div className="admin-filters grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        {!loteFilter ? (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider">Lote</Label>
            <Select
              value={loteQueryFilter || "__all"}
              onValueChange={(v) => {
                if (v === "__all") {
                  searchParams.delete("lote");
                } else {
                  searchParams.set("lote", v);
                }
                setSearchParams(searchParams, { replace: true });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="__none">Sin lote ({unassignedCount})</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
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
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="Cuadro">Cuadro</SelectItem>
              <SelectItem value="Escultura">Escultura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              <SelectItem value="En Galería">En Galería</SelectItem>
              <SelectItem value="En Tránsito">En Tránsito</SelectItem>
              <SelectItem value="Entregada">Entregada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={`space-y-2 lg:col-span-1${isGaleria ? " max-sm:hidden" : ""}`}>
          <Label className="text-[10px] uppercase tracking-wider">Buscar</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o artista…" />
        </div>
      </div>

      {isGaleria ? (
        <div className="admin-obras-page__search-mobile space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Buscar</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título o artista…"
            className="h-11"
            inputMode="search"
            autoComplete="off"
          />
        </div>
      ) : null}

      {selectedIds.size > 0 && !isGaleria ? (
        <div className="admin-callout">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{selectedIds.size}</strong> obra(s) seleccionada(s)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={bulkLoteTarget || undefined} onValueChange={setBulkLoteTarget}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Asignar a lote…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin lote</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!bulkLoteTarget || assigningLote}
              onClick={() => void assignSelectedToLote()}
            >
              {assigningLote ? "Asignando…" : "Asignar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Limpiar
            </Button>
          </div>
        </div>
      ) : null}

      {isGaleria ? (
        <ObrasGallery rows={filtered} isLoading={isLoading} canEdit={canEditObras} />
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleSelectAll(v === true)}
                    aria-label="Seleccionar todas"
                    disabled={filtered.length === 0}
                  />
                </TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Val. ref.</TableHead>
                <TableHead>Val. pub.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-muted-foreground">
                    No hay obras con estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={(v) => toggleSelectOne(r.id, v === true)}
                        aria-label={`Seleccionar ${r.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium underline-offset-2 hover:underline"
                        onClick={() => setReadRow(r)}
                      >
                        {r.title}
                      </button>
                    </TableCell>
                    <TableCell>{r.artists?.name ?? "—"}</TableCell>
                    <TableCell>{r.tipo ?? "—"}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{r.dimensions ?? "—"}</TableCell>
                    <TableCell>{r.weight_kg != null ? `${r.weight_kg}` : "—"}</TableCell>
                    <TableCell>{r.price_ref_usd != null ? `U$D ${r.price_ref_usd}` : "—"}</TableCell>
                    <TableCell>{r.price_usd != null ? `U$D ${r.price_usd}` : "—"}</TableCell>
                    <TableCell>
                      <span
                        className={
                          r.status === "sold"
                            ? "admin-status admin-status--filled"
                            : r.status === "reserved"
                              ? "admin-status admin-status--muted"
                              : "admin-status"
                        }
                      >
                        {adminArtworkStatusLabel(r.status)}
                      </span>
                    </TableCell>
                    <TableCell>{r.ubicacion ?? "—"}</TableCell>
                    <TableCell>{r.estado_pago ?? "—"}</TableCell>
                    <TableCell className="space-x-1">
                      {canEditObras ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteTarget(r)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Solo lectura</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
        <AlertDialogContent className="border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar a la Papelera</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Enviar <strong>{deleteTarget?.title}</strong> a la Papelera? Podés restaurarla después. Se borra
              definitivamente a los 30 días.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-bridge-black text-[#fcf8ea]" onClick={() => void confirmDelete()}>
              Enviar a Papelera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent className="border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Renombrar lote</AlertDialogTitle>
            <AlertDialogDescription>El nombre no puede quedar vacío.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="lote-rename">Nombre</Label>
            <Input
              id="lote-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveRenameLote();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bridge-black text-[#fcf8ea]"
              disabled={loteBusy || !renameValue.trim()}
              onClick={(e) => {
                e.preventDefault();
                void saveRenameLote();
              }}
            >
              Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteLoteOpen} onOpenChange={setDeleteLoteOpen}>
        <AlertDialogContent className="border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar lote a la Papelera</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Enviar <strong>{loteMeta?.nombre ?? `lote #${loteFilter}`}</strong> a la Papelera? Las obras asignadas
              quedan sin lote (no se eliminan). Podés restaurar el lote después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bridge-black text-[#fcf8ea]"
              disabled={loteBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteLote();
              }}
            >
              Enviar a Papelera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

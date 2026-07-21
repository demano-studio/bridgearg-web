import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite, type PiezaConjunto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { AdminArtworkRow } from "@/features/admin/types";
import { adminStatusFromLabel } from "@/features/admin/adminUtils";

const selectOne =
  "id,title,image_url,status,price_usd,price_ref_usd,ubicacion,estado_pago,comprador,fecha_venta,certificado,notas,es_conjunto,piezas,lote_id,dimensions,weight_kg,width_cm,height_cm,depth_cm,artist_id,year,medium,tipo,enmarque,materiales,extra_image_paths";

type Form = {
  title: string;
  artist_id: string;
  lote_id: string;
  tipo: string;
  enmarque: string;
  certificado: boolean;
  es_conjunto: boolean;
  ancho: string;
  largo: string;
  profundidad: string;
  peso: string;
  medium: string;
  materiales: string;
  year: string;
  price_ref_usd: string;
  price_usd: string;
  estadoVenta: string;
  ubicacion: string;
  estado_pago: string;
  comprador: string;
  fecha_venta: string;
  notas: string;
  piezas: PiezaConjunto[];
};

const emptyPieza = (): PiezaConjunto => ({
  nombre: "",
  largo: null,
  ancho: null,
  profundidad: null,
  peso: null,
});

function emptyForm(loteId?: number | null): Form {
  return {
    title: "",
    artist_id: "",
    lote_id: loteId != null ? String(loteId) : "",
    tipo: "Cuadro",
    enmarque: "",
    certificado: false,
    es_conjunto: false,
    ancho: "",
    largo: "",
    profundidad: "",
    peso: "",
    medium: "",
    materiales: "",
    year: "",
    price_ref_usd: "",
    price_usd: "",
    estadoVenta: "Stock",
    ubicacion: "En Galería",
    estado_pago: "Pendiente",
    comprador: "",
    fecha_venta: "",
    notas: "",
    piezas: [emptyPieza()],
  };
}

function rowToForm(row: AdminArtworkRow): Form {
  const statusLabel = row.status === "sold" ? "Vendida" : row.status === "reserved" ? "Reservada" : "Stock";
  let piezas: PiezaConjunto[] = [];
  if (Array.isArray(row.piezas) && row.piezas.length) piezas = row.piezas as PiezaConjunto[];
  else piezas = [emptyPieza()];
  return {
    title: row.title ?? "",
    artist_id: String(row.artist_id),
    lote_id: row.lote_id != null ? String(row.lote_id) : "",
    tipo: row.tipo ?? "Cuadro",
    enmarque: row.enmarque ?? "",
    certificado: Boolean(row.certificado),
    es_conjunto: Boolean(row.es_conjunto),
    ancho: row.width_cm != null ? String(row.width_cm) : "",
    largo: row.height_cm != null ? String(row.height_cm) : "",
    profundidad: row.depth_cm != null ? String(row.depth_cm) : "",
    peso: row.weight_kg != null ? String(row.weight_kg) : "",
    medium: row.medium ?? "",
    materiales: row.materiales ?? "",
    year: row.year ?? "",
    price_ref_usd: row.price_ref_usd != null ? String(row.price_ref_usd) : "",
    price_usd: row.price_usd != null ? String(row.price_usd) : "",
    estadoVenta: statusLabel,
    ubicacion: row.ubicacion ?? "En Galería",
    estado_pago: row.estado_pago ?? "Pendiente",
    comprador: row.comprador ?? "",
    fecha_venta: row.fecha_venta ?? "",
    notas: row.notas ?? "",
    piezas,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artworkId: number | null;
  onSaved?: () => void;
  initialLoteId?: number | null;
};

export function ObraModal({ open, onOpenChange, artworkId, onSaved, initialLoteId }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<Form>(() => emptyForm(initialLoteId ?? undefined));
  const [heroPath, setHeroPath] = React.useState("");
  const [extraPaths, setExtraPaths] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);

  const [artistList, setArtistList] = React.useState<{ id: number; name: string }[]>([]);
  const [loteList, setLoteList] = React.useState<{ id: number; nombre: string }[]>([]);

  React.useEffect(() => {
    if (!open) return;
    void (async () => {
      const sb = getSupabase();
      const [a, l] = await Promise.all([
        sb.from("artists").select("id,name").order("name"),
        sb.from("lotes").select("id,nombre").order("id"),
      ]);
      if (!a.error) setArtistList((a.data ?? []) as { id: number; name: string }[]);
      if (!l.error) setLoteList((l.data ?? []) as { id: number; nombre: string }[]);
    })();
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      return;
    }
    if (!artworkId) {
      setForm(emptyForm(initialLoteId ?? undefined));
      setHeroPath("");
      setExtraPaths([]);
      setFiles([]);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from("artworks").select(selectOne).eq("id", artworkId).single();
        if (error) throw new Error(error.message);
        const row = data as AdminArtworkRow;
        setForm(rowToForm(row));
        setHeroPath(row.image_url ?? "");
        setExtraPaths(Array.isArray(row.extra_image_paths) ? (row.extra_image_paths as string[]) : []);
        setFiles([]);
      } catch (e) {
        toast({
          title: "No se pudo cargar la obra",
          description: e instanceof Error ? e.message : "",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, artworkId, initialLoteId]);

  async function uploadNewFiles(prefix: string): Promise<string[]> {
    if (files.length === 0) return [];
    const sb = getSupabase();
    const out: string[] = [];
    for (const file of files) {
      let fileToUpload: File = file;
      try {
        fileToUpload = await imageCompression(file, {
          maxWidthOrHeight: 2000,
          initialQuality: 0.82,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
      } catch (compressionError) {
        console.error("Image compression failed, uploading original file:", compressionError);
      }
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${prefix}/${crypto.randomUUID()}-${safe}`;
      const signed = await adminWrite("storage.signUpload", { path }) as {
        token?: string;
      };
      const token = signed.token;
      if (!token) throw new Error("Could not sign upload URL");
      const { error } = await sb.storage.from("artworks").uploadToSignedUrl(path, token, fileToUpload, {
        upsert: false,
      });
      if (error) throw new Error(error.message);
      out.push(path);
    }
    return out;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.artist_id) {
      toast({ title: "Elegí un artista", variant: "destructive" });
      return;
    }
    const prefix = artworkId != null ? `admin/${artworkId}` : `admin/nuevo/${Date.now()}`;
    setSaving(true);
    try {
      const newPaths = await uploadNewFiles(prefix);
      let finalHero = heroPath;
      let finalExtras = [...extraPaths];
      if (newPaths.length > 0) {
        finalHero = newPaths[0];
        finalExtras = [...finalExtras, ...newPaths.slice(1)];
      }
      if (!finalHero) {
        toast({ title: "Falta imagen principal", description: "Subí al menos una foto.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const width_cm = form.ancho === "" ? null : Number(form.ancho);
      const height_cm = form.largo === "" ? null : Number(form.largo);
      const depth_cm = form.profundidad === "" ? null : Number(form.profundidad);
      const weight_kg = form.peso === "" ? null : Number(form.peso);
      const dimParts = [form.ancho && `A ${form.ancho}`, form.largo && `L ${form.largo}`, form.profundidad && `P ${form.profundidad}`].filter(Boolean);
      const dimensions = dimParts.length ? `${dimParts.join(" × ")} cm` : null;

      const piezasPayload = form.es_conjunto ? form.piezas.filter((p) => p.nombre.trim()) : [];

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        image_url: finalHero,
        artist_id: Number(form.artist_id),
        status: adminStatusFromLabel(form.estadoVenta),
        price_usd: form.price_usd === "" ? null : Number(form.price_usd),
        price_ref_usd: form.price_ref_usd === "" ? null : Number(form.price_ref_usd),
        year: form.year.trim() || null,
        medium: form.medium.trim() || null,
        materiales: form.materiales.trim() || null,
        dimensions,
        width_cm: width_cm != null && Number.isFinite(width_cm) ? width_cm : null,
        height_cm: height_cm != null && Number.isFinite(height_cm) ? height_cm : null,
        depth_cm: depth_cm != null && Number.isFinite(depth_cm) ? depth_cm : null,
        weight_kg: weight_kg != null && Number.isFinite(weight_kg) ? weight_kg : null,
        ubicacion: form.ubicacion,
        estado_pago: form.estado_pago,
        comprador: form.comprador.trim() || null,
        fecha_venta: form.fecha_venta.trim() || null,
        certificado: form.certificado,
        notas: form.notas.trim() || null,
        es_conjunto: form.es_conjunto,
        piezas: piezasPayload,
        lote_id: form.lote_id ? Number(form.lote_id) : null,
        tipo: form.tipo || null,
        enmarque: form.enmarque.trim() || null,
        extra_image_paths: finalExtras,
      };

      if (artworkId != null) {
        await adminWrite("artwork.update", { id: artworkId, ...payload });
        toast({ title: "Obra actualizada" });
      } else {
        await adminWrite("artwork.create", payload);
        toast({ title: "Obra creada" });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function updatePieza(i: number, patch: Partial<PiezaConjunto>) {
    setForm((f) => ({
      ...f,
      piezas: f.piezas.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] max-w-3xl flex-col rounded-none border-bridge-black/20 p-0 font-display">
        <DialogHeader className="shrink-0 border-b border-bridge-black/10 px-6 py-4">
          <DialogTitle>{artworkId ? "Editar obra" : "Nueva obra"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1 px-6">
              <div className="space-y-6 py-4 pr-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nombre</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Artista</Label>
                    <Select
                      value={form.artist_id || "__pick"}
                      onValueChange={(v) => setForm((f) => ({ ...f, artist_id: v === "__pick" ? "" : v }))}
                    >
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="__pick" disabled>
                          Elegí artista
                        </SelectItem>
                        {artistList.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lote</Label>
                    <Select value={form.lote_id || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, lote_id: v === "__none" ? "" : v }))}>
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue placeholder="Sin lote" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="__none">Sin lote</SelectItem>
                        {loteList.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="Cuadro">Cuadro</SelectItem>
                        <SelectItem value="Escultura">Escultura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Enmarcado</Label>
                    <Input
                      value={form.enmarque}
                      onChange={(e) => setForm((f) => ({ ...f, enmarque: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.certificado} onCheckedChange={(c) => setForm((f) => ({ ...f, certificado: Boolean(c) }))} />
                      Certificado
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.es_conjunto} onCheckedChange={(c) => setForm((f) => ({ ...f, es_conjunto: Boolean(c) }))} />
                      Es conjunto
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dimensiones (cm / kg)</div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Ancho</Label>
                      <Input
                        value={form.ancho}
                        onChange={(e) => setForm((f) => ({ ...f, ancho: e.target.value }))}
                        className="rounded-none border-bridge-black/20"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Largo / alto</Label>
                      <Input
                        value={form.largo}
                        onChange={(e) => setForm((f) => ({ ...f, largo: e.target.value }))}
                        className="rounded-none border-bridge-black/20"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Profundidad</Label>
                      <Input
                        value={form.profundidad}
                        onChange={(e) => setForm((f) => ({ ...f, profundidad: e.target.value }))}
                        className="rounded-none border-bridge-black/20"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Peso (kg)</Label>
                      <Input
                        value={form.peso}
                        onChange={(e) => setForm((f) => ({ ...f, peso: e.target.value }))}
                        className="rounded-none border-bridge-black/20"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Técnica</Label>
                    <Input
                      value={form.medium}
                      onChange={(e) => setForm((f) => ({ ...f, medium: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Materiales</Label>
                    <Input
                      value={form.materiales}
                      onChange={(e) => setForm((f) => ({ ...f, materiales: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Input
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Precio referencia U$D</Label>
                    <Input
                      value={form.price_ref_usd}
                      onChange={(e) => setForm((f) => ({ ...f, price_ref_usd: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio publicado U$D</Label>
                    <Input
                      value={form.price_usd}
                      onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={form.estadoVenta} onValueChange={(v) => setForm((f) => ({ ...f, estadoVenta: v }))}>
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="Stock">Stock</SelectItem>
                        <SelectItem value="Vendida">Vendida</SelectItem>
                        <SelectItem value="Reservada">Reservada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Select value={form.ubicacion} onValueChange={(v) => setForm((f) => ({ ...f, ubicacion: v }))}>
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="En Galería">En Galería</SelectItem>
                        <SelectItem value="En Tránsito">En Tránsito</SelectItem>
                        <SelectItem value="Entregada">Entregada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de pago</Label>
                    <Select value={form.estado_pago} onValueChange={(v) => setForm((f) => ({ ...f, estado_pago: v }))}>
                      <SelectTrigger className="rounded-none border-bridge-black/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Señada">Señada</SelectItem>
                        <SelectItem value="Pagada">Pagada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Comprador</Label>
                    <Input
                      value={form.comprador}
                      onChange={(e) => setForm((f) => ({ ...f, comprador: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de venta</Label>
                    <Input
                      type="date"
                      value={form.fecha_venta}
                      onChange={(e) => setForm((f) => ({ ...f, fecha_venta: e.target.value }))}
                      className="rounded-none border-bridge-black/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={form.notas}
                    onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                    rows={3}
                    className="rounded-none border-bridge-black/20"
                  />
                </div>

                {form.es_conjunto ? (
                  <div className="space-y-3 border border-bridge-black/15 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Piezas del conjunto</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => setForm((f) => ({ ...f, piezas: [...f.piezas, emptyPieza()] }))}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar pieza
                      </Button>
                    </div>
                    {form.piezas.map((p, i) => (
                      <div key={i} className="grid gap-2 border border-bridge-black/10 p-3 sm:grid-cols-6">
                        <Input
                          placeholder="Nombre"
                          value={p.nombre}
                          onChange={(e) => updatePieza(i, { nombre: e.target.value })}
                          className="rounded-none sm:col-span-2"
                        />
                        <Input
                          placeholder="Largo"
                          value={p.largo ?? ""}
                          onChange={(e) => updatePieza(i, { largo: e.target.value || null })}
                          className="rounded-none"
                        />
                        <Input
                          placeholder="Ancho"
                          value={p.ancho ?? ""}
                          onChange={(e) => updatePieza(i, { ancho: e.target.value || null })}
                          className="rounded-none"
                        />
                        <Input
                          placeholder="Prof."
                          value={p.profundidad ?? ""}
                          onChange={(e) => updatePieza(i, { profundidad: e.target.value || null })}
                          className="rounded-none"
                        />
                        <Input
                          placeholder="Peso"
                          value={p.peso ?? ""}
                          onChange={(e) => updatePieza(i, { peso: e.target.value || null })}
                          className="rounded-none"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="rounded-none"
                          disabled={form.piezas.length <= 1}
                          onClick={() => setForm((f) => ({ ...f, piezas: f.piezas.filter((_, j) => j !== i) }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 border border-bridge-black/15 p-4">
                  <Label>Fotos (la primera queda como imagen principal en catálogo)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ruta actual principal: {heroPath || "—"}. Subí archivos para reemplazar o completar la galería.
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="rounded-none border-bridge-black/20"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                  {files.length > 0 ? (
                    <p className="text-xs">{files.length} archivo(s) listos para subir al guardar.</p>
                  ) : null}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="shrink-0 border-t border-bridge-black/10 px-6 py-4">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="rounded-none">
                {saving ? <Loader2 className="animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

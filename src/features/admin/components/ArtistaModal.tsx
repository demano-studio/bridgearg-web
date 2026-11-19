import * as React from "react";
import imageCompression from "browser-image-compression";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { AdminArtistRow } from "@/features/admin/types";
import { slugify } from "@/features/admin/adminUtils";
import { getArtistImagePublicUrl, resolveAdminImageSrc } from "@/lib/supabaseStorage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: number | null;
  onSaved?: () => void;
};

type ImageSlot = "image_url" | "detail_image_url" | "studio_image_url";

const IMAGE_SLOTS: Array<{ key: ImageSlot; label: string; hint: string }> = [
  { key: "image_url", label: "Retrato", hint: "Foto principal del artista" },
  { key: "detail_image_url", label: "Detalle", hint: "Imagen de detalle / close-up" },
  { key: "studio_image_url", label: "Estudio", hint: "Foto del estudio o taller" },
];

export function ArtistaModal({ open, onOpenChange, artistId, onSaved }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [statement, setStatement] = React.useState("");
  const [comisionBridge, setComisionBridge] = React.useState(30);
  const [comisionArtista, setComisionArtista] = React.useState(70);
  const [images, setImages] = React.useState<Record<ImageSlot, string>>({
    image_url: "",
    detail_image_url: "",
    studio_image_url: "",
  });
  const [pendingFiles, setPendingFiles] = React.useState<Partial<Record<ImageSlot, File>>>({});
  const [pendingPreviews, setPendingPreviews] = React.useState<Partial<Record<ImageSlot, string>>>({});

  function setBridge(v: number) {
    const b = Math.min(100, Math.max(0, v));
    setComisionBridge(b);
    setComisionArtista(100 - b);
  }

  function setArtistaPct(v: number) {
    const a = Math.min(100, Math.max(0, v));
    setComisionArtista(a);
    setComisionBridge(100 - a);
  }

  function resetForm() {
    setName("");
    setEmail("");
    setTelefono("");
    setInstagram("");
    setBio("");
    setStatement("");
    setComisionBridge(30);
    setComisionArtista(70);
    setImages({ image_url: "", detail_image_url: "", studio_image_url: "" });
    setPendingFiles({});
  }

  React.useEffect(() => {
    const next: Partial<Record<ImageSlot, string>> = {};
    const urls: string[] = [];
    for (const slot of IMAGE_SLOTS) {
      const file = pendingFiles[slot.key];
      if (file) {
        const url = URL.createObjectURL(file);
        next[slot.key] = url;
        urls.push(url);
      }
    }
    setPendingPreviews(next);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [pendingFiles]);

  React.useEffect(() => {
    if (!open) {
      setPendingFiles({});
      return;
    }
    if (!artistId) {
      resetForm();
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("artists")
          .select(
            "id,name,slug,bio,statement,image_url,detail_image_url,studio_image_url,email,telefono,instagram,comision_bridge,comision_artista",
          )
          .eq("id", artistId)
          .single();
        if (error) throw new Error(error.message);
        const row = data as AdminArtistRow;
        setName(row.name ?? "");
        setEmail(row.email ?? "");
        setTelefono(row.telefono ?? "");
        setInstagram(row.instagram ?? "");
        setBio(row.bio ?? "");
        setStatement(row.statement ?? "");
        setComisionBridge(Number(row.comision_bridge ?? 30));
        setComisionArtista(Number(row.comision_artista ?? 70));
        setImages({
          image_url: row.image_url ?? "",
          detail_image_url: row.detail_image_url ?? "",
          studio_image_url: row.studio_image_url ?? "",
        });
        setPendingFiles({});
      } catch (e) {
        toast({
          title: "No se pudo cargar el artista",
          description: e instanceof Error ? e.message : "",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, artistId]);

  async function uploadArtistImage(file: File, prefix: string): Promise<string> {
    const sb = getSupabase();
    let fileToUpload: File = file;
    try {
      fileToUpload = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.85,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
    } catch (compressionError) {
      console.error("Artist image compression failed, uploading original:", compressionError);
    }
    const safe = file.name.replace(/[^\w.-]+/g, "_");
    const path = `${prefix}/${crypto.randomUUID()}-${safe}`;
    const signed = (await adminWrite("storage.signUpload", { path, bucket: "artists" })) as {
      token?: string;
    };
    const token = signed.token;
    if (!token) throw new Error("Could not sign upload URL");
    const { error } = await sb.storage.from("artists").uploadToSignedUrl(path, token, fileToUpload, {
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return getArtistImagePublicUrl(path);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const prefix = artistId != null ? `admin/${artistId}` : `admin/nuevo/${Date.now()}`;
      const nextImages = { ...images };
      for (const slot of IMAGE_SLOTS) {
        const file = pendingFiles[slot.key];
        if (file) {
          nextImages[slot.key] = await uploadArtistImage(file, prefix);
        }
      }

      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        telefono: telefono.trim() || null,
        instagram: instagram.trim() || null,
        bio: bio.trim() || null,
        statement: statement.trim() || null,
        comision_bridge: comisionBridge,
        comision_artista: comisionArtista,
        image_url: nextImages.image_url.trim() || null,
        detail_image_url: nextImages.detail_image_url.trim() || null,
        studio_image_url: nextImages.studio_image_url.trim() || null,
      };
      if (artistId != null) {
        await adminWrite("artist.update", { id: artistId, ...payload });
        toast({ title: "Artista actualizado" });
      } else {
        const base = slugify(name);
        let slug = base;
        let n = 0;
        while (n < 50) {
          const { data: exists } = await getSupabase().from("artists").select("id").eq("slug", slug).maybeSingle();
          if (!exists) break;
          n += 1;
          slug = `${base}-${n}`;
        }
        await adminWrite("artist.create", { ...payload, slug });
        toast({ title: "Artista creado" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog--sheet !flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden border-bridge-black/20 p-0">
        <DialogHeader className="shrink-0 border-b border-bridge-black/10 px-6 py-4 pr-12">
          <DialogTitle>{artistId ? "Editar artista" : "Nuevo artista"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="admin-dialog-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Statement</Label>
              <Textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={3}
                className="border-bridge-black/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Comisión Bridge %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={comisionBridge}
                  onChange={(e) => setBridge(Number(e.target.value))}
                  className="border-bridge-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Comisión artista %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={comisionArtista}
                  onChange={(e) => setArtistaPct(Number(e.target.value))}
                  className="border-bridge-black/20"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Las dos comisiones suman 100% al editar cualquiera de los dos campos.</p>

            <div className="space-y-4 border border-bridge-black/15 p-4">
              <div>
                <Label>Fotos</Label>
                <p className="mt-1 text-xs text-muted-foreground">Se suben al bucket artists/ al guardar.</p>
              </div>
              {IMAGE_SLOTS.map((slot) => {
                const current = resolveAdminImageSrc(images[slot.key], "artists");
                const pending = pendingPreviews[slot.key];
                const src = pending || current;
                return (
                  <div key={slot.key} className="flex flex-wrap items-start gap-3 border-t border-bridge-black/10 pt-3 first:border-t-0 first:pt-0">
                    <div className="h-24 w-24 shrink-0 border border-bridge-black/15 bg-muted/20">
                      {src ? (
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-[10rem] flex-1 space-y-2">
                      <div>
                        <div className="text-sm font-medium">{slot.label}</div>
                        <div className="text-xs text-muted-foreground">{slot.hint}</div>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="border-bridge-black/20"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setPendingFiles((prev) => {
                            const next = { ...prev };
                            if (f) next[slot.key] = f;
                            else delete next[slot.key];
                            return next;
                          });
                          e.target.value = "";
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles[slot.key] ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPendingFiles((prev) => {
                                const next = { ...prev };
                                delete next[slot.key];
                                return next;
                              })
                            }
                          >
                            Cancelar
                          </Button>
                        ) : null}
                        {images[slot.key] || pendingFiles[slot.key] ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setImages((prev) => ({ ...prev, [slot.key]: "" }));
                              setPendingFiles((prev) => {
                                const next = { ...prev };
                                delete next[slot.key];
                                return next;
                              });
                            }}
                          >
                            Quitar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-bridge-black/10 bg-[var(--admin-cream,#fcf8ea)] px-6 py-4 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

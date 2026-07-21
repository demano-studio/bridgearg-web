import * as React from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: number | null;
  onSaved?: () => void;
};

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

  React.useEffect(() => {
    if (!open) return;
    if (!artistId) {
      setName("");
      setEmail("");
      setTelefono("");
      setInstagram("");
      setBio("");
      setStatement("");
      setComisionBridge(30);
      setComisionArtista(70);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from("artists")
          .select("id,name,slug,bio,statement,photo,profile_image_url,email,telefono,instagram,comision_bridge,comision_artista")
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        telefono: telefono.trim() || null,
        instagram: instagram.trim() || null,
        bio: bio.trim() || null,
        statement: statement.trim() || null,
        comision_bridge: comisionBridge,
        comision_artista: comisionArtista,
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
      <DialogContent className="max-w-lg rounded-none border-bridge-black/20 font-display">
        <DialogHeader>
          <DialogTitle>{artistId ? "Editar artista" : "Nuevo artista"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-none border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-none border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="rounded-none border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="rounded-none border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="rounded-none border-bridge-black/20" />
            </div>
            <div className="space-y-2">
              <Label>Statement</Label>
              <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} className="rounded-none border-bridge-black/20" />
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
                  className="rounded-none border-bridge-black/20"
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
                  className="rounded-none border-bridge-black/20"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Las dos comisiones suman 100% al editar cualquiera de los dos campos.</p>
            <DialogFooter className="gap-2 sm:gap-0">
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

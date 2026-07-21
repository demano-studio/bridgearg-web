import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import type { AdminArtistRow } from "@/features/admin/types";
import { artistPhotoPath } from "@/features/admin/adminUtils";
import { getArtworkImagePublicUrl } from "@/lib/supabaseStorage";
import { ArtistaModal } from "@/features/admin/components/ArtistaModal";

export default function ArtistasPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminArtistRow | null>(null);

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ["admin", "artists", "full"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artists")
        .select("id,name,slug,bio,photo,profile_image_url,email,telefono,instagram,comision_bridge,comision_artista")
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminArtistRow[];
    },
  });

  const { data: priceByArtist = new Map<number, { ref: number; pub: number; count: number }>() } = useQuery({
    queryKey: ["admin", "artists", "totals"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("artworks").select("artist_id,price_usd,price_ref_usd");
      if (error) throw new Error(error.message);
      const m = new Map<number, { ref: number; pub: number; count: number }>();
      for (const row of data ?? []) {
        const aid = Number((row as { artist_id: number }).artist_id);
        const cur = m.get(aid) ?? { ref: 0, pub: 0, count: 0 };
        const pr = (row as { price_ref_usd: number | null }).price_ref_usd;
        const pu = (row as { price_usd: number | null }).price_usd;
        cur.ref += pr != null ? Number(pr) : 0;
        cur.pub += pu != null ? Number(pu) : 0;
        cur.count += 1;
        m.set(aid, cur);
      }
      return m;
    },
  });

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await adminWrite("artist.delete", { id: deleteTarget.id });
      toast({ title: "Artista eliminado" });
      void qc.invalidateQueries({ queryKey: ["admin", "artists"] });
      void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
      setDeleteTarget(null);
    } catch (e) {
      toast({
        title: "No se pudo eliminar",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Artistas</h1>
          <p className="text-sm text-muted-foreground">Doble click en una tarjeta para filtrar obras por artista.</p>
        </div>
        <Button
          type="button"
          className="rounded-none"
          onClick={() => {
            setEditingId(null);
            setEditorOpen(true);
          }}
        >
          Nuevo artista
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {artists.map((a) => {
            const photo = artistPhotoPath(a);
            const img = photo ? (photo.startsWith("http") ? photo : getArtworkImagePublicUrl(photo)) : null;
            const totals = priceByArtist.get(a.id);
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className="border border-bridge-black/15 bg-bridge-cream/40 p-4 text-left outline-none transition-colors hover:border-bridge-black/30 focus-visible:ring-1 focus-visible:ring-bridge-black"
                onDoubleClick={() => navigate(`/admin/obras?artistId=${a.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/admin/obras?artistId=${a.id}`);
                }}
              >
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 border border-bridge-black/10 bg-muted/30">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">{a.name}</h2>
                    <p className="truncate text-xs text-muted-foreground">{a.slug}</p>
                    <div className="mt-2 space-y-0.5 text-xs">
                      {a.email ? <p>{a.email}</p> : null}
                      {a.telefono ? <p>{a.telefono}</p> : null}
                      {a.instagram ? <p>@{a.instagram.replace(/^@/, "")}</p> : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-bridge-black/10 pt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div>
                    <div className="text-foreground">{totals?.count ?? 0}</div>obras
                  </div>
                  <div>
                    <div className="text-foreground">{totals?.ref != null ? `U$D ${Math.round(totals.ref)}` : "—"}</div>
                    ref.
                  </div>
                  <div>
                    <div className="text-foreground">{totals?.pub != null ? `U$D ${Math.round(totals.pub)}` : "—"}</div>
                    pub.
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>Bridge {Number(a.comision_bridge ?? 30)}%</span>
                  <span>Artista {Number(a.comision_artista ?? 70)}%</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(a.id);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(a);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ArtistaModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        artistId={editingId}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["admin", "artists"] })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artista</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{deleteTarget?.name}</strong>? No podrás si tiene obras vinculadas (FK).
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

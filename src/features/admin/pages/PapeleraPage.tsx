import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminWrite } from "@/lib/api";
import { getSupabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";

type TrashArtwork = {
  id: number;
  title: string;
  deleted_at: string;
  artists: { name: string } | null;
};

type TrashLote = {
  id: number;
  nombre: string;
  deleted_at: string;
};

type HardTarget =
  | { kind: "artwork"; id: number; name: string }
  | { kind: "lote"; id: number; name: string };

function formatDeletedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysLeft(iso: string): number {
  const deleted = new Date(iso).getTime();
  if (Number.isNaN(deleted)) return 30;
  const purgeAt = deleted + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function PapeleraPage() {
  const qc = useQueryClient();
  const access = useAdminAccess();
  const canEdit = access.canEdit("papelera");
  const [tab, setTab] = React.useState("obras");
  const [hardTarget, setHardTarget] = React.useState<HardTarget | null>(null);
  const [confirmText, setConfirmText] = React.useState("");

  const { data: obras = [], isLoading: loadingObras } = useQuery({
    queryKey: ["admin", "papelera", "artworks"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("artworks")
        .select("id,title,deleted_at,artists(name)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TrashArtwork[];
    },
  });

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ["admin", "papelera", "lotes"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id,nombre,deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TrashLote[];
    },
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "papelera"] });
    void qc.invalidateQueries({ queryKey: ["admin", "artworks"] });
    void qc.invalidateQueries({ queryKey: ["admin", "lotes"] });
    void qc.invalidateQueries({ queryKey: ["admin", "sidebar"] });
    void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
  };

  const restoreArtwork = useMutation({
    mutationFn: async (id: number) => adminWrite("artwork.restore", { id }),
    onSuccess: () => {
      toast({ title: "Obra restaurada" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "No se pudo restaurar", description: e.message, variant: "destructive" }),
  });

  const restoreLote = useMutation({
    mutationFn: async (id: number) => adminWrite("lote.restore", { id }),
    onSuccess: () => {
      toast({ title: "Lote restaurado" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "No se pudo restaurar", description: e.message, variant: "destructive" }),
  });

  const hardDelete = useMutation({
    mutationFn: async (target: HardTarget) => {
      if (target.kind === "artwork") return adminWrite("artwork.hardDelete", { id: target.id });
      return adminWrite("lote.hardDelete", { id: target.id });
    },
    onSuccess: () => {
      toast({ title: "Eliminado definitivamente" });
      setHardTarget(null);
      setConfirmText("");
      invalidateAll();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo eliminar definitivamente", description: e.message, variant: "destructive" }),
  });

  const confirmOk =
    hardTarget != null &&
    (confirmText.trim() === hardTarget.name || confirmText.trim().toUpperCase() === "ELIMINAR");

  React.useEffect(() => {
    if (!hardTarget) setConfirmText("");
  }, [hardTarget]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Papelera</h1>
        <p className="text-sm text-muted-foreground">
          Ítems eliminados. Se borran definitivamente a los 30 días, o antes desde acá.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-bridge-black/15 bg-transparent">
          <TabsTrigger value="obras">Obras ({obras.length})</TabsTrigger>
          <TabsTrigger value="lotes">Lotes ({lotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="obras" className="mt-4">
          {loadingObras ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : obras.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay obras en la papelera.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="py-2 pr-4">Obra</th>
                    <th className="py-2 pr-4">Artista</th>
                    <th className="py-2 pr-4">Eliminada</th>
                    <th className="py-2 pr-4">Purge</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {obras.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-4 font-medium">{row.title}</td>
                      <td className="py-2.5 pr-4">{row.artists?.name ?? "—"}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{formatDeletedAt(row.deleted_at)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{daysLeft(row.deleted_at)}d</td>
                      <td className="py-2.5">
                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-bridge-black/20"
                              disabled={restoreArtwork.isPending}
                              onClick={() => restoreArtwork.mutate(row.id)}
                            >
                              Restaurar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive"
                              onClick={() => setHardTarget({ kind: "artwork", id: row.id, name: row.title })}
                            >
                              Eliminar definitivamente
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lotes" className="mt-4">
          {loadingLotes ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : lotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay lotes en la papelera.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="py-2 pr-4">Lote</th>
                    <th className="py-2 pr-4">Eliminado</th>
                    <th className="py-2 pr-4">Purge</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-4 font-medium">{row.nombre}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{formatDeletedAt(row.deleted_at)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{daysLeft(row.deleted_at)}d</td>
                      <td className="py-2.5">
                        {canEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-bridge-black/20"
                              disabled={restoreLote.isPending}
                              onClick={() => restoreLote.mutate(row.id)}
                            >
                              Restaurar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive"
                              onClick={() => setHardTarget({ kind: "lote", id: row.id, name: row.nombre })}
                            >
                              Eliminar definitivamente
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={hardTarget != null}
        onOpenChange={(open) => {
          if (!open && !hardDelete.isPending) setHardTarget(null);
        }}
      >
        <DialogContent className="border-bridge-black/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar definitivamente</DialogTitle>
            <DialogDescription>
              Esto borra <strong>{hardTarget?.name}</strong> de la base para siempre. Escribí el nombre exacto o la
              palabra <strong>ELIMINAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hard-delete-confirm">Confirmación</Label>
            <Input
              id="hard-delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={hardTarget?.name ?? "ELIMINAR"}
              className="border-bridge-black/20"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-bridge-black/20"
              disabled={hardDelete.isPending}
              onClick={() => setHardTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!confirmOk || hardDelete.isPending || !hardTarget}
              onClick={() => {
                if (hardTarget) hardDelete.mutate(hardTarget);
              }}
            >
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

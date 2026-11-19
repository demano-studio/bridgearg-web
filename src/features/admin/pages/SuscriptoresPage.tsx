import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { adminWrite } from "@/lib/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { AdminSubscriberRow } from "@/features/admin/types";
import { csvStamp, downloadCsv } from "@/features/admin/csv";

export default function SuscriptoresPage() {
  const qc = useQueryClient();
  const [sourceFilter, setSourceFilter] = React.useState("__all");
  const [q, setQ] = React.useState("");
  const deferredQ = React.useDeferredValue(q);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminSubscriberRow | null>(null);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "subscribers"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error: qErr } = await sb
        .from("newsletter_subscribers")
        .select("id,email,source,consented_at,created_at,marketing_consent")
        .order("created_at", { ascending: false });
      if (qErr) throw new Error(qErr.message);
      return (data ?? []) as AdminSubscriberRow[];
    },
  });

  const sources = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.source?.trim()) set.add(r.source.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== "__all" && r.source !== sourceFilter) return false;
      if (!needle) return true;
      return [r.email, r.source].join(" ").toLowerCase().includes(needle);
    });
  }, [rows, sourceFilter, deferredQ]);

  const deleteSubscriber = useMutation({
    mutationFn: async (id: number) => adminWrite("subscriber.delete", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "subscribers"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar", "counts"] });
      toast({
        title: "Suscriptor eliminado",
        description: deleteTarget?.email,
      });
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" });
    },
  });

  function exportCsv() {
    if (filtered.length === 0) {
      toast({ title: "Nada para exportar", description: "No hay suscriptores con el filtro actual." });
      return;
    }
    downloadCsv(
      `suscriptores-${csvStamp()}.csv`,
      ["Email", "Origen", "Alta", "Consentimiento"],
      filtered.map((r) => [
        r.email,
        r.source,
        r.consented_at ?? r.created_at,
        r.marketing_consent ? "Sí" : "No",
      ]),
    );
    toast({ title: "CSV descargado", description: `${filtered.length} suscriptor(es)` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suscriptores</h1>
          <p className="text-sm text-muted-foreground">
            Newsletter · {rows.length} en total
            {filtered.length !== rows.length ? ` · ${filtered.length} filtrados` : ""}.
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
            placeholder="Email u origen…"
            className="border-bridge-black/20"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Origen</Label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando suscriptores…</p>
      ) : isError ? (
        <p className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          No se pudieron cargar los suscriptores
          {error instanceof Error && error.message ? `: ${error.message}` : "."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="border-t border-[rgba(30,21,23,0.14)] py-8 text-sm text-muted-foreground">
          {rows.length === 0 ? "No hay suscriptores todavía." : "No hay suscriptores con este filtro."}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Consentimiento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <a href={`mailto:${r.email}`} className="underline-offset-2 hover:underline">
                      {r.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className="admin-status admin-status--muted">{r.source || "—"}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDate(r.consented_at ?? r.created_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        r.marketing_consent ? "admin-status admin-status--filled" : "admin-status admin-status--muted"
                      }
                    >
                      {r.marketing_consent ? "Sí" : "No"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(r)}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar suscriptor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{deleteTarget?.email}</strong>
              {deleteTarget?.source ? (
                <>
                  {" "}
                  (origen <strong>{deleteTarget.source}</strong>)
                </>
              ) : null}
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubscriber.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bridge-black text-[#fcf8ea]"
              disabled={deleteSubscriber.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteSubscriber.mutate(deleteTarget.id);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

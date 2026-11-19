import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { AdminContactMessageRow, AdminMessageStatus } from "@/features/admin/types";
import { adminMessageStatusLabel } from "@/features/admin/adminUtils";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "__open", label: "Sin responder" },
  { value: "__all", label: "Todos" },
  { value: "new", label: "Nuevos" },
  { value: "read", label: "Leídos" },
  { value: "responded", label: "Respondidos" },
];

export default function MensajesPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("id");
  const [statusFilter, setStatusFilter] = React.useState("__open");
  const [q, setQ] = React.useState("");
  const deferredQ = React.useDeferredValue(q);
  const [detail, setDetail] = React.useState<AdminContactMessageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminContactMessageRow | null>(null);
  const openedFromSearch = React.useRef<number | null>(null);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "contact-messages"],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error: qErr } = await sb
        .from("contact_messages")
        .select("id,full_name,email,subject,message,status,marketing_consent,read_at,responded_at,created_at")
        .order("created_at", { ascending: false });
      if (qErr) throw new Error(qErr.message);
      return (data ?? []) as AdminContactMessageRow[];
    },
  });

  const openCount = React.useMemo(() => rows.filter((r) => r.status !== "responded").length, [rows]);

  const filtered = React.useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "__open" && r.status === "responded") return false;
      if (statusFilter !== "__all" && statusFilter !== "__open" && r.status !== statusFilter) return false;
      if (!needle) return true;
      const hay = [r.full_name, r.email, r.subject, r.message].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, statusFilter, deferredQ]);

  const updateStatus = useMutation({
    mutationFn: async (input: { id: number; status: AdminMessageStatus }) =>
      adminWrite("message.updateStatus", input) as Promise<AdminContactMessageRow>,
    onSuccess: (data, vars) => {
      void qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar", "counts"] });
      toast({ title: "Estado actualizado", description: adminMessageStatusLabel(vars.status) });
      setDetail((prev) => (prev && prev.id === vars.id ? { ...prev, ...data } : prev));
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo actualizar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => adminWrite("message.delete", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
      void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
      void qc.invalidateQueries({ queryKey: ["admin", "sidebar", "counts"] });
      toast({
        title: "Mensaje eliminado",
        description: deleteTarget ? `${deleteTarget.full_name} · ${deleteTarget.subject}` : undefined,
      });
      if (detail && deleteTarget && detail.id === deleteTarget.id) setDetail(null);
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" });
    },
  });

  async function openDetail(row: AdminContactMessageRow) {
    setDetail(row);
    if (row.status === "new") {
      try {
        const updated = (await adminWrite("message.updateStatus", {
          id: row.id,
          status: "read",
        })) as AdminContactMessageRow;
        setDetail(updated);
        void qc.invalidateQueries({ queryKey: ["admin", "contact-messages"] });
        void qc.invalidateQueries({ queryKey: ["admin", "resumen"] });
        void qc.invalidateQueries({ queryKey: ["admin", "sidebar", "counts"] });
      } catch {
        /* keep row as-is if mark-read fails */
      }
    }
  }

  React.useEffect(() => {
    if (!openId || !/^\d+$/.test(openId) || rows.length === 0) return;
    const id = Number(openId);
    if (openedFromSearch.current === id) return;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    openedFromSearch.current = id;
    setStatusFilter("__all");
    void openDetail(row);
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
  }, [openId, rows, searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mensajes</h1>
        <p className="text-sm text-muted-foreground">
          Inbox del formulario de contact
          {rows.length > 0 ? ` · ${openCount} sin responder` : ""}.
        </p>
      </div>

      <div className="admin-filters grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Buscar</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, email o asunto…"
            className="border-bridge-black/20"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-bridge-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando mensajes…</p>
      ) : isError ? (
        <p className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          No se pudieron cargar los mensajes{error instanceof Error && error.message ? `: ${error.message}` : "."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="border-t border-[rgba(30,21,23,0.14)] py-8 text-sm text-muted-foreground">
          {rows.length === 0
            ? "Todavía no hay mensajes. Aparecen acá cuando alguien envía el formulario de contact."
            : "No hay mensajes con este filtro."}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className={r.status === "new" ? "bg-[rgba(127,178,209,0.06)]" : undefined}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDate(r.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-sm">
                    <a href={`mailto:${r.email}`} className="underline-offset-2 hover:underline">
                      {r.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[18rem] truncate">{r.subject}</div>
                  </TableCell>
                  <TableCell>
                    <span className={statusClass(r.status)}>{adminMessageStatusLabel(r.status)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openDetail(r)}>
                        Ver
                      </Button>
                      {r.status !== "responded" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: r.id, status: "responded" })}
                        >
                          Marcar respondido
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(r)}>
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg border-bridge-black/20">
          <DialogHeader>
            <DialogTitle>{detail?.subject ?? "Mensaje"}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.full_name} · ${detail.email} · ${fmtDate(detail.created_at)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={statusClass(detail.status)}>{adminMessageStatusLabel(detail.status)}</span>
                {detail.marketing_consent ? (
                  <span className="admin-status admin-status--muted">Consentimiento marketing</span>
                ) : null}
              </div>
              <div className="whitespace-pre-wrap border-t border-[rgba(30,21,23,0.12)] pt-4 leading-relaxed text-[rgba(30,21,23,0.88)]">
                {detail.message}
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
            <div className="flex flex-wrap gap-2">
              {detail ? (
                <Button type="button" variant="outline" asChild>
                  <a
                    href={`mailto:${detail.email}?subject=${encodeURIComponent(`Re: ${detail.subject}`)}`}
                  >
                    Responder por email
                  </a>
                </Button>
              ) : null}
              {detail ? (
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(detail)}>
                  Eliminar
                </Button>
              ) : null}
              {detail && detail.status !== "responded" ? (
                <Button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: detail.id, status: "responded" })}
                >
                  Marcar respondido
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-bridge-black/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar mensaje</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el mensaje de <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email}) sobre{" "}
              <strong>{deleteTarget?.subject}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMessage.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bridge-black text-[#fcf8ea]"
              disabled={deleteMessage.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMessage.mutate(deleteTarget.id);
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

function statusClass(status: AdminMessageStatus | string): string {
  if (status === "responded") return "admin-status admin-status--filled";
  if (status === "new") return "admin-status";
  return "admin-status admin-status--muted";
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

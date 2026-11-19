import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { tradeAdmin, type TradeApplicationAdminRow, type TradeRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

type ConfirmKind = "approve" | "reject" | "deactivate" | "reopen" | "delete";

const ROLE_OPTIONS: { value: TradeRole; label: string }[] = [
  { value: "interior_designer", label: "Interior designer" },
  { value: "architect", label: "Architect" },
  { value: "developer", label: "Real estate developer" },
  { value: "art_consultant", label: "Art consultant" },
  { value: "other", label: "Other" },
];

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function hasActiveCode(row: TradeApplicationAdminRow): boolean {
  return Boolean(row.promo_code && row.stripe_promotion_code_id && !row.deactivated_at);
}

function StatusBadge({ row }: { row: TradeApplicationAdminRow }) {
  if (row.status === "approved" && row.deactivated_at) {
    return <span className="admin-status admin-status--muted">Desactivado</span>;
  }
  if (row.status === "approved") {
    return <span className="admin-status admin-status--filled">Aprobado</span>;
  }
  if (row.status === "rejected") {
    return <span className="admin-status admin-status--muted">Rechazado</span>;
  }
  return <span className="admin-status">Pendiente</span>;
}

function confirmCopy(kind: ConfirmKind, row: TradeApplicationAdminRow | null): { title: string; body: string; action: string } {
  const name = row?.full_name ?? "este cliente";
  const code = row?.promo_code ? ` (${row.promo_code})` : "";
  switch (kind) {
    case "approve":
      return {
        title: "¿Aprobar esta solicitud?",
        body: `Se emitirá un código Trade para ${name} y se enviará a ${row?.email ?? "el solicitante"}.`,
        action: "Aprobar",
      };
    case "reject":
      return {
        title: "¿Rechazar esta solicitud?",
        body: hasActiveCode(row!)
          ? "Se desactivará el código de descuento del cliente. ¿Continuar?"
          : `¿Rechazar a ${name}? No recibirá código Trade.`,
        action: "Rechazar",
      };
    case "deactivate":
      return {
        title: "¿Desactivar este código?",
        body: `Se desactivará el código de descuento${code}. ¿Continuar?`,
        action: "Desactivar",
      };
    case "reopen":
      return {
        title: "¿Reabrir esta solicitud?",
        body: hasActiveCode(row!)
          ? "Se desactivará el código y la solicitud volverá a Pendiente. ¿Continuar?"
          : `¿Volver a poner a ${name} en Pendiente para revisarla otra vez?`,
        action: "Reabrir",
      };
    case "delete":
      return {
        title: "¿Eliminar esta solicitud?",
        body: hasActiveCode(row!)
          ? "Se desactivará el código y se eliminará la solicitud de forma permanente. No se puede deshacer."
          : `¿Eliminar permanentemente la solicitud de ${name}? No se puede deshacer.`,
        action: "Eliminar",
      };
  }
}

export default function TradeAdminPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [detail, setDetail] = React.useState<TradeApplicationAdminRow | null>(null);
  const [confirm, setConfirm] = React.useState<{ kind: ConfirmKind; row: TradeApplicationAdminRow } | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState<TradeRole | "">("");
  const [notes, setNotes] = React.useState("");

  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "trade", statusFilter],
    queryFn: async () => {
      const result = await tradeAdmin("list", statusFilter === "all" ? {} : { status: statusFilter });
      return (result.applications ?? []) as TradeApplicationAdminRow[];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "trade"] });

  const actionMutation = useMutation({
    mutationFn: async (input: { action: string; id: string }) => tradeAdmin(input.action, { id: input.id }),
    onSuccess: (_data, vars) => {
      invalidate();
      const titles: Record<string, string> = {
        approve: "Application approved",
        reject: "Application rejected",
        deactivate: "Promotion code deactivated",
        resend_email: "Welcome email sent",
        reopen: "Application reopened",
        delete: "Application deleted",
      };
      toast({ title: titles[vars.action] ?? "Done" });
      setConfirm(null);
      setDetail(null);
    },
    onError: (e: Error) => {
      toast({ title: "Could not complete the action", description: e.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!role) throw new Error("Please select a role.");
      return tradeAdmin("create", {
        full_name: fullName.trim(),
        email: email.trim(),
        company: company.trim(),
        role,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Client added and approved" });
      setAddOpen(false);
      setFullName("");
      setEmail("");
      setCompany("");
      setRole("");
      setNotes("");
    },
    onError: (e: Error) => {
      toast({ title: "Could not add client", description: e.message, variant: "destructive" });
    },
  });

  const busyId = actionMutation.isPending
    ? String((actionMutation.variables as { id?: string } | undefined)?.id ?? "")
    : "";

  const copy = confirmCopy(confirm?.kind ?? "approve", confirm?.row ?? null);
  const confirmDestructive = confirm?.kind === "reject" || confirm?.kind === "reopen" || confirm?.kind === "delete" || confirm?.kind === "deactivate";

  function rowActions(row: TradeApplicationAdminRow) {
    const rowBusy = busyId === row.id;
    const disabled = rowBusy || actionMutation.isPending;
    const btn = "h-7 border-bridge-black/30 px-2 text-[10px] uppercase tracking-wider";

    if (row.status === "pending") {
      return (
        <>
          <Button type="button" size="sm" className={cn(btn, "border-transparent")} disabled={disabled} onClick={() => setConfirm({ kind: "approve", row })}>
            Aprobar
          </Button>
          <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "reject", row })}>
            Rechazar
          </Button>
          <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "delete", row })}>
            Eliminar
          </Button>
        </>
      );
    }

    if (row.status === "approved") {
      return (
        <>
          <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "reject", row })}>
            Rechazar
          </Button>
          {hasActiveCode(row) ? (
            <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "deactivate", row })}>
              Desactivar código
            </Button>
          ) : null}
          {hasActiveCode(row) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btn}
              disabled={disabled}
              onClick={() => actionMutation.mutate({ action: "resend_email", id: row.id })}
            >
              Reenviar mail
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "reopen", row })}>
            Reabrir
          </Button>
          <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "delete", row })}>
            Eliminar
          </Button>
        </>
      );
    }

    // rejected
    return (
      <>
        <Button type="button" size="sm" className={cn(btn, "border-transparent")} disabled={disabled} onClick={() => setConfirm({ kind: "approve", row })}>
          Aprobar
        </Button>
        <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "reopen", row })}>
          Reabrir
        </Button>
        <Button type="button" size="sm" variant="outline" className={btn} disabled={disabled} onClick={() => setConfirm({ kind: "delete", row })}>
          Eliminar
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trade</h1>
          <p className="text-sm text-muted-foreground">
            Solicitudes, códigos 15% y altas manuales.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Agregar cliente
        </Button>
      </div>

      <div className="admin-filters grid gap-3 sm:grid-cols-[14rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Estado</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando solicitudes…
        </div>
      ) : isError ? (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "No se pudieron cargar las solicitudes Trade."}
        </div>
      ) : rows.length === 0 ? (
        <p className="border-t border-[rgba(30,21,23,0.14)] py-8 text-sm text-muted-foreground">
          No hay solicitudes con este filtro.
        </p>
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer",
                    detail?.id === row.id && "bg-[rgba(127,178,209,0.08)]",
                  )}
                  onClick={() => setDetail(row)}
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {row.full_name}
                      {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin opacity-60" aria-hidden /> : null}
                    </span>
                  </TableCell>
                  <TableCell>{row.company}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{roleLabel(row.role)}</TableCell>
                  <TableCell className="text-xs">{row.email}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(row.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge row={row} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.promo_code ?? "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">{rowActions(row)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="admin-dialog--sheet !flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-bridge-black/10 px-6 py-4 pr-12">
            <DialogTitle>{detail?.full_name}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.company} · ${roleLabel(detail.role)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="admin-dialog-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-4 text-sm">
              <DetailRow label="Email" value={detail.email} />
              <DetailRow label="Web / Instagram" value={detail.website || "—"} />
              <DetailRow label="Tipo de proyecto" value={detail.project_type || "—"} />
              <DetailRow label="Origen" value={detail.source} />
              <DetailRow label="Código" value={detail.promo_code || "—"} />
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Mensaje</p>
                <p className="whitespace-pre-wrap text-[rgba(30,21,23,0.85)]">{detail.message || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap text-[rgba(30,21,23,0.85)]">{detail.notes || "—"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="admin-dialog--sheet !flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-bridge-black/10 px-6 py-4 pr-12">
            <DialogTitle>Agregar cliente Trade</DialogTitle>
            <DialogDescription>
              Crea el cliente y emite un código de promoción 15% de inmediato.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="admin-dialog-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="trade-add-name">Nombre completo</Label>
              <Input
                id="trade-add-name"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-bridge-black/25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-add-email">Email</Label>
              <Input
                id="trade-add-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-bridge-black/25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-add-company">Estudio o empresa</Label>
              <Input
                id="trade-add-company"
                required
                maxLength={160}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="border-bridge-black/25"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TradeRole)}>
                <SelectTrigger className="border-bridge-black/25">
                  <SelectValue placeholder="Elegir rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-add-notes">Notas</Label>
              <Textarea
                id="trade-add-notes"
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[90px] border-bridge-black/25"
              />
            </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-bridge-black/10 bg-[var(--admin-cream,#fcf8ea)] px-6 py-4 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !role}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando…
                  </>
                ) : (
                  "Crear y aprobar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(confirmDestructive && "bg-bridge-black text-[#fcf8ea] hover:bg-bridge-black/90")}
              disabled={actionMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                actionMutation.mutate({ action: confirm.kind, id: confirm.row.id });
              }}
            >
              {actionMutation.isPending ? "Procesando…" : copy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-bridge-black/85">{value}</p>
    </div>
  );
}

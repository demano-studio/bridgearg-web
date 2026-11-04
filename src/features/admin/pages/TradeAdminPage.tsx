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
    return (
      <span className="inline-flex border border-bridge-black/25 bg-bridge-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bridge-black/70">
        Deactivated
      </span>
    );
  }
  if (row.status === "approved") {
    return (
      <span className="inline-flex border border-emerald-700/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
        Approved
      </span>
    );
  }
  if (row.status === "rejected") {
    return (
      <span className="inline-flex border border-red-700/25 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-800">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex border border-amber-700/30 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
      Pending
    </span>
  );
}

function confirmCopy(kind: ConfirmKind, row: TradeApplicationAdminRow | null): { title: string; body: string; action: string } {
  const name = row?.full_name ?? "this client";
  const code = row?.promo_code ? ` (${row.promo_code})` : "";
  switch (kind) {
    case "approve":
      return {
        title: "Approve this application?",
        body: `We'll issue a Trade discount code for ${name} and email it to ${row?.email ?? "the applicant"}.`,
        action: "Approve",
      };
    case "reject":
      return {
        title: "Reject this application?",
        body: hasActiveCode(row!)
          ? "This will deactivate the client's discount code. Continue?"
          : `Reject ${name}? They will not receive a Trade discount code.`,
        action: "Reject",
      };
    case "deactivate":
      return {
        title: "Deactivate this code?",
        body: `This will deactivate the client's discount code${code}. Continue?`,
        action: "Deactivate",
      };
    case "reopen":
      return {
        title: "Reopen this application?",
        body: hasActiveCode(row!)
          ? "This will deactivate the client's discount code and move the application back to Pending. Continue?"
          : `Move ${name} back to Pending so you can review it again?`,
        action: "Reopen",
      };
    case "delete":
      return {
        title: "Delete this application?",
        body: hasActiveCode(row!)
          ? "This will deactivate the client's discount code and permanently delete the application. This cannot be undone."
          : `Permanently delete ${name}'s application. This cannot be undone.`,
        action: "Delete",
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
    const btn = "h-7 rounded-none border-bridge-black/30 px-2 text-[10px] uppercase tracking-wider";

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
          <h1 className="text-xl font-semibold tracking-tight">Trade Program</h1>
          <p className="text-sm text-muted-foreground">
            Review applications, issue 15% codes, and add clients manually.
          </p>
        </div>
        <Button type="button" className="rounded-none" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 border border-bridge-black/15 bg-bridge-cream/30 p-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[200px] rounded-none border-bridge-black/25">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-none border-bridge-black/30"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading applications…
        </div>
      ) : isError ? (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load Trade applications."}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No applications in this filter.</p>
      ) : (
        <div className="overflow-x-auto border border-bridge-black/15">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Company</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Code</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn("cursor-pointer", detail?.id === row.id && "bg-bridge-cream/50")}
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
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.full_name}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.company} · ${roleLabel(detail.role)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <DetailRow label="Email" value={detail.email} />
              <DetailRow label="Website / Instagram" value={detail.website || "—"} />
              <DetailRow label="Project type" value={detail.project_type || "—"} />
              <DetailRow label="Source" value={detail.source} />
              <DetailRow label="Code" value={detail.promo_code || "—"} />
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap text-bridge-black/80">{detail.message || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap text-bridge-black/80">{detail.notes || "—"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Trade client</DialogTitle>
            <DialogDescription>
              Creates the client and issues a 15% promotion code immediately.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="trade-add-name">Full name</Label>
              <Input
                id="trade-add-name"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-none border-bridge-black/25"
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
                className="rounded-none border-bridge-black/25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-add-company">Studio or company</Label>
              <Input
                id="trade-add-company"
                required
                maxLength={160}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-none border-bridge-black/25"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TradeRole)}>
                <SelectTrigger className="rounded-none border-bridge-black/25">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-add-notes">Notes</Label>
              <Textarea
                id="trade-add-notes"
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[90px] rounded-none border-bridge-black/25"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => setAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-none" disabled={createMutation.isPending || !role}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create & approve"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "rounded-none",
                confirmDestructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              disabled={actionMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                actionMutation.mutate({ action: confirm.kind, id: confirm.row.id });
              }}
            >
              {actionMutation.isPending ? "Working…" : copy.action}
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

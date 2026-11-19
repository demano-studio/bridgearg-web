import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";
import {
  ADMIN_SECTIONS,
  ADMIN_SECTION_LABELS,
  type AdminSection,
} from "@/features/admin/adminSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MemberRow = {
  user_id: string;
  email: string;
  is_owner: boolean;
};

type PermRow = {
  user_id: string;
  section: AdminSection;
  can_view: boolean;
  can_edit: boolean;
};

const EDITABLE_SECTIONS = ADMIN_SECTIONS.filter((s) => s !== "equipo");

type InvitePreset = "vendedor" | "community" | "catalogo";

const INVITE_PRESET_OPTIONS: Array<{ id: InvitePreset; label: string; hint: string }> = [
  {
    id: "vendedor",
    label: "Vendedor",
    hint: "Editar Resumen, Obras y Pedidos; ver Mensajes.",
  },
  {
    id: "community",
    label: "Community / Marketing",
    hint: "Editar Mensajes y Suscriptores; ver Resumen.",
  },
  {
    id: "catalogo",
    label: "Catálogo (solo vista)",
    hint: "Ver Resumen, Obras, Artistas y Lotes.",
  },
];

async function teamAction(
  action: "invite" | "revokeAccess" | "deleteUser",
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("admin-invite", {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message ?? "Error en Equipo");
  const result = (data ?? {}) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (result.error) throw new Error(String(result.error));
  if (!result.ok) throw new Error("La operación falló");
  return result;
}

export default function EquipoPage() {
  const access = useAdminAccess();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [invitePreset, setInvitePreset] = React.useState<InvitePreset>("catalogo");
  const [deleteTarget, setDeleteTarget] = React.useState<MemberRow | null>(null);
  const [confirmText, setConfirmText] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "equipo"],
    enabled: access.isOwner,
    queryFn: async () => {
      const sb = getSupabase();
      const [{ data: members, error: mErr }, { data: perms, error: pErr }] = await Promise.all([
        sb.from("admin_users").select("user_id,email,is_owner").order("created_at", { ascending: true }),
        sb.from("admin_permissions").select("user_id,section,can_view,can_edit"),
      ]);
      if (mErr) throw new Error(mErr.message);
      if (pErr) throw new Error(pErr.message);
      return {
        members: (members ?? []) as MemberRow[],
        perms: (perms ?? []) as PermRow[],
      };
    },
  });

  const invalidateEquipo = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "equipo"] });
    void qc.invalidateQueries({ queryKey: ["admin", "access"] });
  };

  const inviteMut = useMutation({
    mutationFn: () =>
      teamAction("invite", { email: inviteEmail.trim().toLowerCase(), preset: invitePreset }),
    onSuccess: (result) => {
      toast({
        title: result.already_member
          ? "Ya es miembro del equipo"
          : result.invited
            ? "Invitación enviada"
            : "Miembro agregado",
        description: inviteEmail.trim().toLowerCase(),
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePreset("catalogo");
      invalidateEquipo();
    },
    onError: (e: Error) => toast({ title: "No se pudo invitar", description: e.message, variant: "destructive" }),
  });

  const savePerm = useMutation({
    mutationFn: async (input: {
      user_id: string;
      section: AdminSection;
      can_view: boolean;
      can_edit: boolean;
    }) => {
      const sb = getSupabase();
      const can_view = input.can_edit ? true : input.can_view;
      const { error } = await sb.from("admin_permissions").upsert(
        {
          user_id: input.user_id,
          section: input.section,
          can_view,
          can_edit: input.can_edit,
        },
        { onConflict: "user_id,section" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateEquipo();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo guardar el permiso", description: e.message, variant: "destructive" }),
  });

  const revokeMut = useMutation({
    mutationFn: (member: MemberRow) => teamAction("revokeAccess", { user_id: member.user_id }),
    onSuccess: (_result, member) => {
      toast({ title: "Acceso revocado", description: member.email });
      invalidateEquipo();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo revocar el acceso", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (member: MemberRow) => teamAction("deleteUser", { user_id: member.user_id }),
    onSuccess: (_result, member) => {
      toast({ title: "Cuenta eliminada", description: member.email });
      setDeleteTarget(null);
      setConfirmText("");
      invalidateEquipo();
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo eliminar la cuenta", description: e.message, variant: "destructive" }),
  });

  const confirmOk =
    deleteTarget != null &&
    (confirmText.trim().toLowerCase() === deleteTarget.email.toLowerCase() ||
      confirmText.trim().toUpperCase() === "ELIMINAR");

  React.useEffect(() => {
    if (!deleteTarget) setConfirmText("");
  }, [deleteTarget]);

  if (!access.isOwner) {
    return <p className="text-sm text-muted-foreground">Solo el owner puede ver Equipo.</p>;
  }

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Cargando equipo…</p>;
  }

  function flagsFor(userId: string, section: AdminSection): { can_view: boolean; can_edit: boolean } {
    const row = data!.perms.find((p) => p.user_id === userId && p.section === section);
    return { can_view: Boolean(row?.can_view || row?.can_edit), can_edit: Boolean(row?.can_edit) };
  }

  const busyRow =
    revokeMut.isPending || deleteMut.isPending
      ? ((revokeMut.variables ?? deleteMut.variables) as MemberRow | undefined)?.user_id
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground">Permisos por sección. El owner tiene acceso total.</p>
        </div>
        <Button type="button" className="bg-bridge-black text-[#fcf8ea]" onClick={() => setInviteOpen(true)}>
          Invitar
        </Button>
      </div>

      <div className="space-y-8">
        {data.members.map((member) => (
          <section key={member.user_id} className="border border-bridge-black/15 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{member.email}</h2>
                {member.is_owner ? (
                  <span className="admin-status admin-status--filled">Owner</span>
                ) : (
                  <span className="admin-status admin-status--muted">Miembro</span>
                )}
              </div>
              {!member.is_owner ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-bridge-black/20"
                    disabled={busyRow === member.user_id || savePerm.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Revocar acceso a ${member.email}? La cuenta sigue existiendo; podés volver a tildar permisos después.`,
                        )
                      ) {
                        revokeMut.mutate(member);
                      }
                    }}
                  >
                    Revocar acceso
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive"
                    disabled={busyRow === member.user_id}
                    onClick={() => setDeleteTarget(member)}
                  >
                    Eliminar cuenta
                  </Button>
                </div>
              ) : null}
            </div>

            {member.is_owner ? (
              <p className="text-sm text-muted-foreground">Acceso total — no se editan permisos individuales.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4">Sección</th>
                      <th className="py-2 pr-4">Ver</th>
                      <th className="py-2">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EDITABLE_SECTIONS.map((section) => {
                      const flags = flagsFor(member.user_id, section);
                      return (
                        <tr key={section}>
                          <td className="py-2 pr-4">{ADMIN_SECTION_LABELS[section]}</td>
                          <td className="py-2 pr-4">
                            <Checkbox
                              checked={flags.can_view}
                              disabled={savePerm.isPending || busyRow === member.user_id}
                              onCheckedChange={(v) => {
                                const on = v === true;
                                savePerm.mutate({
                                  user_id: member.user_id,
                                  section,
                                  can_view: on,
                                  can_edit: on ? flags.can_edit : false,
                                });
                              }}
                            />
                          </td>
                          <td className="py-2">
                            <Checkbox
                              checked={flags.can_edit}
                              disabled={savePerm.isPending || busyRow === member.user_id}
                              onCheckedChange={(v) => {
                                const on = v === true;
                                savePerm.mutate({
                                  user_id: member.user_id,
                                  section,
                                  can_view: on ? true : flags.can_view,
                                  can_edit: on,
                                });
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail("");
            setInvitePreset("catalogo");
          }
        }}
      >
        <DialogContent className="border-bridge-black/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar al equipo</DialogTitle>
            <DialogDescription>
              Se envía un mail de Supabase Auth para setear contraseña. El preset es un punto de partida; después lo
              podés ajustar en la grilla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="border-bridge-black/20"
                placeholder="persona@bridgearg.net"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Preset de permisos</legend>
              <div className="space-y-2">
                {INVITE_PRESET_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer gap-3 border p-3 ${
                      invitePreset === opt.id ? "border-bridge-black/40 bg-[rgba(30,21,23,0.04)]" : "border-bridge-black/15"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invite-preset"
                      className="mt-1"
                      checked={invitePreset === opt.id}
                      onChange={() => setInvitePreset(opt.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={inviteMut.isPending || !inviteEmail.trim()}
              onClick={() => inviteMut.mutate()}
            >
              Enviar invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-bridge-black/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar cuenta</DialogTitle>
            <DialogDescription>
              Esto borra permanentemente la cuenta de Auth de <strong>{deleteTarget?.email}</strong> y sus permisos.
              Escribí el email exacto o la palabra <strong>ELIMINAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-member-confirm">Confirmación</Label>
            <Input
              id="delete-member-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deleteTarget?.email ?? "ELIMINAR"}
              className="border-bridge-black/20"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-bridge-black/20"
              disabled={deleteMut.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!confirmOk || deleteMut.isPending || !deleteTarget}
              onClick={() => {
                if (deleteTarget) deleteMut.mutate(deleteTarget);
              }}
            >
              Eliminar cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

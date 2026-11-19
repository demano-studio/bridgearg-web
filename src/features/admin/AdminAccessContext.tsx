import * as React from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabaseClient";
import {
  ADMIN_SECTIONS,
  emptyPermissions,
  pathForSection,
  type AdminAccessState,
  type AdminSection,
} from "@/features/admin/adminSections";

const AdminAccessContext = React.createContext<AdminAccessState | null>(null);

export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "access", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const sb = getSupabase();
      const uid = user!.id;
      const [{ data: adminRow, error: adminErr }, { data: perms, error: permErr }] = await Promise.all([
        sb.from("admin_users").select("user_id,email,is_owner").eq("user_id", uid).maybeSingle(),
        sb.from("admin_permissions").select("section,can_view,can_edit").eq("user_id", uid),
      ]);
      if (adminErr) throw new Error(adminErr.message);
      if (permErr) throw new Error(permErr.message);

      const permissions = emptyPermissions();
      for (const row of perms ?? []) {
        const section = row.section as AdminSection;
        if (!ADMIN_SECTIONS.includes(section)) continue;
        permissions[section] = {
          can_view: Boolean(row.can_view) || Boolean(row.can_edit),
          can_edit: Boolean(row.can_edit),
        };
      }

      return {
        isMember: Boolean(adminRow),
        isOwner: Boolean(adminRow?.is_owner),
        email: (adminRow?.email as string | undefined) ?? user?.email ?? null,
        permissions,
      };
    },
  });

  const value = React.useMemo<AdminAccessState>(() => {
    const isOwner = Boolean(data?.isOwner);
    const isMember = Boolean(data?.isMember);
    const permissions = data?.permissions ?? emptyPermissions();

    const canView = (section: AdminSection) => {
      if (isOwner) return true;
      return permissions[section]?.can_view === true || permissions[section]?.can_edit === true;
    };
    const canEdit = (section: AdminSection) => {
      if (isOwner) return true;
      return permissions[section]?.can_edit === true;
    };
    const firstAllowedPath = () => {
      if (isOwner) return "/admin/resumen";
      for (const section of ADMIN_SECTIONS) {
        if (section === "equipo") continue;
        if (canView(section)) return pathForSection(section);
      }
      return "/admin/sin-acceso";
    };

    return {
      ready: !isLoading && Boolean(user),
      isOwner,
      isMember,
      email: data?.email ?? user?.email ?? null,
      permissions,
      canView,
      canEdit,
      firstAllowedPath,
    };
  }, [data, isLoading, user]);

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): AdminAccessState {
  const ctx = React.useContext(AdminAccessContext);
  if (!ctx) {
    const permissions = emptyPermissions();
    return {
      ready: false,
      isOwner: false,
      isMember: false,
      email: null,
      permissions,
      canView: () => false,
      canEdit: () => false,
      firstAllowedPath: () => "/admin/sin-acceso",
    };
  }
  return ctx;
}

export function RequireSection({
  section,
  children,
}: {
  section: AdminSection;
  children: React.ReactNode;
}) {
  const access = useAdminAccess();

  if (!access.ready) {
    return <p className="text-sm text-muted-foreground">Cargando permisos…</p>;
  }
  if (!access.isMember && !access.isOwner) {
    return <Navigate to="/admin/sin-acceso" replace />;
  }
  if (!access.canView(section)) {
    return <Navigate to={access.firstAllowedPath()} replace />;
  }
  return <>{children}</>;
}

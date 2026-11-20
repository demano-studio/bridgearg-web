import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Images,
  Package,
  MoreHorizontal,
  Handshake,
  MessageSquare,
  Users,
  Layers,
  Mail,
  Trash2,
  UsersRound,
  Settings,
} from "lucide-react";
import { getSupabase } from "@/lib/supabaseClient";
import { useAdminAccess } from "@/features/admin/AdminAccessContext";
import type { AdminSection } from "@/features/admin/adminSections";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type TabDef = {
  key: string;
  label: string;
  to: string;
  section: AdminSection | "configuracion";
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const PRIMARY: TabDef[] = [
  {
    key: "resumen",
    label: "Resumen",
    to: "/admin/resumen",
    section: "resumen",
    icon: LayoutDashboard,
  },
  {
    key: "obras",
    label: "Obras",
    to: "/admin/obras",
    section: "obras",
    icon: Images,
    match: (p) => p === "/admin/obras" || p.startsWith("/admin/obras?"),
  },
  {
    key: "pedidos",
    label: "Pedidos",
    to: "/admin/pedidos",
    section: "pedidos",
    icon: Package,
  },
];

const MORE_GROUPS: Array<{ id: string; label: string | null; items: TabDef[] }> = [
  {
    id: "catalogo",
    label: "Catálogo",
    items: [
      { key: "artistas", label: "Artistas", to: "/admin/artistas", section: "artistas", icon: Users },
      { key: "lotes", label: "Lotes", to: "/admin/obras", section: "lotes", icon: Layers },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    items: [{ key: "trade", label: "Trade", to: "/admin/trade", section: "trade", icon: Handshake }],
  },
  {
    id: "crm",
    label: "CRM",
    items: [
      { key: "mensajes", label: "Mensajes", to: "/admin/mensajes", section: "mensajes", icon: MessageSquare },
      {
        key: "suscriptores",
        label: "Suscriptores",
        to: "/admin/suscriptores",
        section: "suscriptores",
        icon: Mail,
      },
    ],
  },
  {
    id: "sistema",
    label: null,
    items: [
      { key: "papelera", label: "Papelera", to: "/admin/papelera", section: "papelera", icon: Trash2 },
      { key: "equipo", label: "Equipo", to: "/admin/equipo", section: "equipo", icon: UsersRound },
      {
        key: "configuracion",
        label: "Configuración",
        to: "/admin/configuracion",
        section: "configuracion",
        icon: Settings,
      },
    ],
  },
];

const MORE_ORDER: TabDef[] = MORE_GROUPS.flatMap((g) => g.items);

function canAccess(
  access: ReturnType<typeof useAdminAccess>,
  section: AdminSection | "configuracion",
): boolean {
  if (section === "configuracion") return access.isMember || access.isOwner;
  if (section === "equipo") return access.isOwner;
  return access.canView(section);
}

function tabActive(tab: TabDef, pathname: string): boolean {
  if (tab.section === "lotes") return pathname.startsWith("/admin/lotes/");
  if (tab.match) return tab.match(pathname);
  return pathname === tab.to || pathname.startsWith(`${tab.to}/`);
}

export function AdminBottomNav() {
  const access = useAdminAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const { data: counts } = useQuery({
    queryKey: ["admin", "sidebar", "counts"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const sb = getSupabase();
      const [tradePending, mensajesOpen, papeleraObras, papeleraLotes, papeleraMensajes, pedidosOpen] =
        await Promise.all([
          sb.from("trade_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
          sb
            .from("contact_messages")
            .select("id", { count: "exact", head: true })
            .eq("status", "new")
            .is("deleted_at", null),
          sb.from("artworks").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
          sb.from("lotes").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
          sb.from("contact_messages").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
          sb.from("purchases").select("id", { count: "exact", head: true }).neq("shipping_status", "delivered"),
        ]);
      return {
        tradePending: tradePending.error ? undefined : (tradePending.count ?? 0),
        mensajesOpen: mensajesOpen.error ? undefined : (mensajesOpen.count ?? 0),
        papelera: (papeleraObras.count ?? 0) + (papeleraLotes.count ?? 0) + (papeleraMensajes.count ?? 0),
        pedidosOpen: pedidosOpen.error ? undefined : (pedidosOpen.count ?? 0),
      };
    },
  });

  const { data: firstLoteId } = useQuery({
    queryKey: ["admin", "lotes", "first-id"],
    enabled: canAccess(access, "lotes"),
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("lotes")
        .select("id")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.id as number | undefined) ?? null;
    },
  });

  const allowedMore = MORE_ORDER.filter((item) => canAccess(access, item.section));

  const slot1 = canAccess(access, "resumen") ? PRIMARY[0] : null;
  const slot2 = canAccess(access, "obras") ? PRIMARY[1] : null;

  let slot3: TabDef | null = null;
  let promotedKey: string | null = null;
  if (canAccess(access, "pedidos")) {
    slot3 = PRIMARY[2];
  } else {
    const promote = allowedMore.find((item) => item.section !== "configuracion");
    if (promote) {
      slot3 = promote;
      promotedKey = promote.key;
    }
  }

  const moreItems = allowedMore.filter((item) => item.key !== promotedKey);
  const primaryTabs = [slot1, slot2, slot3].filter(Boolean) as TabDef[];
  const pathInMore = moreItems.some((item) => tabActive(item, location.pathname));

  function badgeFor(key: string): number | undefined {
    if (key === "trade") return counts?.tradePending;
    if (key === "mensajes") return counts?.mensajesOpen;
    if (key === "papelera") return counts?.papelera;
    if (key === "pedidos") return counts?.pedidosOpen;
    return undefined;
  }

  function resolveTo(item: TabDef): string {
    if (item.section === "lotes" && firstLoteId != null) {
      return `/admin/lotes/${firstLoteId}`;
    }
    return item.to;
  }

  if (primaryTabs.length === 0 && moreItems.length === 0) return null;

  return (
    <>
      <nav className="admin-bottom-nav" aria-label="Navegación admin">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tabActive(tab, location.pathname);
          const badge = badgeFor(tab.key);
          return (
            <NavLink
              key={tab.key}
              to={resolveTo(tab)}
              className={`admin-bottom-nav__item${active ? " is-active" : ""}`}
            >
              <span className="admin-bottom-nav__icon-wrap">
                <Icon className="admin-bottom-nav__icon" aria-hidden />
                {badge != null && badge > 0 ? (
                  <span className="admin-bottom-nav__badge">{badge > 99 ? "99+" : badge}</span>
                ) : null}
              </span>
              <span className="admin-bottom-nav__label">{tab.label}</span>
            </NavLink>
          );
        })}

        {moreItems.length > 0 ? (
          <button
            type="button"
            className={`admin-bottom-nav__item${pathInMore || moreOpen ? " is-active" : ""}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <span className="admin-bottom-nav__icon-wrap">
              <MoreHorizontal className="admin-bottom-nav__icon" aria-hidden />
            </span>
            <span className="admin-bottom-nav__label">Más</span>
          </button>
        ) : null}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="admin-more-sheet rounded-t-2xl border-bridge-black/15 px-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3"
        >
          <SheetHeader className="px-5 pb-2 text-left">
            <SheetTitle>Más</SheetTitle>
          </SheetHeader>
          <div className="admin-more-sheet__groups">
            {MORE_GROUPS.map((group, groupIndex) => {
              const visible = group.items.filter((item) => moreItems.some((m) => m.key === item.key));
              if (visible.length === 0) return null;
              const showSep = group.label == null && groupIndex > 0;
              return (
                <div key={group.id} className={`admin-more-sheet__group${showSep ? " is-sep" : ""}`}>
                  {group.label ? <div className="admin-more-sheet__group-label">{group.label}</div> : null}
                  <ul className="admin-more-sheet__list">
                    {visible.map((item) => {
                      const Icon = item.icon;
                      const active = tabActive(item, location.pathname);
                      const badge = badgeFor(item.key);
                      const to = resolveTo(item);
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            className={`admin-more-sheet__item${active ? " is-active" : ""}`}
                            onClick={() => {
                              setMoreOpen(false);
                              navigate(to);
                            }}
                          >
                            <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            <span className="flex-1 text-left">{item.label}</span>
                            {badge != null && badge > 0 ? (
                              <span className="admin-more-sheet__badge">{badge > 99 ? "99+" : badge}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

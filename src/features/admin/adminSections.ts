export const ADMIN_SECTIONS = [
  "resumen",
  "obras",
  "artistas",
  "lotes",
  "pedidos",
  "mensajes",
  "suscriptores",
  "trade",
  "papelera",
  "equipo",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const ADMIN_SECTION_LABELS: Record<AdminSection, string> = {
  resumen: "Resumen",
  obras: "Obras",
  artistas: "Artistas",
  lotes: "Lotes",
  pedidos: "Pedidos",
  mensajes: "Mensajes",
  suscriptores: "Suscriptores",
  trade: "Trade",
  papelera: "Papelera",
  equipo: "Equipo",
};

export type AdminPermissionFlags = {
  can_view: boolean;
  can_edit: boolean;
};

export type AdminAccessState = {
  ready: boolean;
  isOwner: boolean;
  isMember: boolean;
  email: string | null;
  permissions: Record<AdminSection, AdminPermissionFlags>;
  canView: (section: AdminSection) => boolean;
  canEdit: (section: AdminSection) => boolean;
  firstAllowedPath: () => string;
};

export function emptyPermissions(): Record<AdminSection, AdminPermissionFlags> {
  return Object.fromEntries(ADMIN_SECTIONS.map((s) => [s, { can_view: false, can_edit: false }])) as Record<
    AdminSection,
    AdminPermissionFlags
  >;
}

export function sectionFromPath(pathname: string): AdminSection | null {
  const rest = pathname.replace(/^\/admin\/?/, "") || "resumen";
  if (rest === "resumen" || rest === "") return "resumen";
  if (rest === "obras" || rest.startsWith("obras?")) return "obras";
  if (rest.startsWith("lotes/")) return "lotes";
  if (rest === "artistas") return "artistas";
  if (rest === "pedidos") return "pedidos";
  if (rest === "mensajes") return "mensajes";
  if (rest === "suscriptores") return "suscriptores";
  if (rest === "trade") return "trade";
  if (rest === "papelera") return "papelera";
  if (rest === "equipo") return "equipo";
  if (rest === "configuracion") return null;
  return null;
}

export function pathForSection(section: AdminSection): string {
  if (section === "lotes") return "/admin/obras";
  return `/admin/${section}`;
}

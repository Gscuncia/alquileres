/**
 * Canonical admin tab registry — single source of truth for the admin
 * sub-navigation, the role-granting checkboxes and the role actions.
 *
 * Every consumer (AdminNavTabs, RoleForm, roles page/actions) MUST import
 * from here. Adding a new admin tab is a one-line change in this list only.
 */

export interface AdminTab {
  id: string;
  label: string;
  /** Public URL segment for the nav link. */
  href: string;
  /** Admin-only tabs are always visible to default admins and never granted via roles. */
  adminOnly: boolean;
}

export const ADMIN_TABS: readonly AdminTab[] = [
  { id: "panel", label: "Panel", href: "/admin", adminOnly: false },
  { id: "calendario", label: "Calendario", href: "/admin/calendario", adminOnly: false },
  { id: "propiedades", label: "Propiedades", href: "/admin/propiedades", adminOnly: false },
  { id: "reservas", label: "Reservas", href: "/admin/reservas", adminOnly: false },
  { id: "huespedes", label: "Huéspedes", href: "/admin/huespedes", adminOnly: false },
  { id: "destinatarios", label: "Destinatarios", href: "/admin/destinatarios", adminOnly: false },
  { id: "gastos", label: "Gastos", href: "/admin/gastos", adminOnly: false },
  { id: "carga-gastos", label: "Carga Gastos", href: "/admin/carga-gastos", adminOnly: false },
  { id: "contexto", label: "Contexto", href: "/admin/contexto", adminOnly: false },
  { id: "feriados", label: "Feriados", href: "/admin/feriados", adminOnly: false },
  { id: "usuarios", label: "Usuarios", href: "/admin/usuarios", adminOnly: true },
  { id: "roles", label: "Roles", href: "/admin/roles", adminOnly: true },
] as const;

/** Tabs that can be granted to a role through the role form. */
export const GRANTABLE_ADMIN_TABS: readonly AdminTab[] = ADMIN_TABS.filter(
  (tab) => !tab.adminOnly,
);

/** Ids of admin-only tabs (never filtered out for default admins). */
export const ADMIN_ONLY_TAB_IDS: ReadonlySet<string> = new Set(
  ADMIN_TABS.filter((tab) => tab.adminOnly).map((tab) => tab.id),
);

/** Human label for a stored tab id; falls back to the raw id when unknown. */
export function adminTabLabel(id: string): string {
  return ADMIN_TABS.find((tab) => tab.id === id)?.label ?? id;
}

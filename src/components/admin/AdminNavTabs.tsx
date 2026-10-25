"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Panel", tab: "panel" },
  { href: "/admin/calendario", label: "Calendario", tab: "calendario" },
  { href: "/admin/propiedades", label: "Propiedades", tab: "propiedades" },
  { href: "/admin/reservas", label: "Reservas", tab: "reservas" },
  { href: "/admin/huespedes", label: "Huéspedes", tab: "huespedes" },
  { href: "/admin/destinatarios", label: "Destinatarios", tab: "destinatarios" },
  { href: "/admin/gastos", label: "Gastos", tab: "gastos" },
  { href: "/admin/carga-gastos", label: "Carga Gastos", tab: "carga-gastos" },
  { href: "/admin/contexto", label: "Contexto", tab: "contexto" },
  { href: "/admin/feriados", label: "Feriados", tab: "feriados" },
  { href: "/admin/usuarios", label: "Usuarios", tab: "usuarios" },
  { href: "/admin/roles", label: "Roles", tab: "roles" },
] as const;

interface AdminNavTabsProps {
  allowedTabs?: string[];
  isDefaultAdmin?: boolean;
}

/**
 * Admin sub-nav: `usePathname` is client-only state, so the active tab
 * (bold + underline per design tokens) lives in a client component.
 *
 * Tabs are filtered by the current user's allowed tabs. Default admins
 * always see every tab.
 */
export function AdminNavTabs({
  allowedTabs = [],
  isDefaultAdmin = false,
}: AdminNavTabsProps) {
  const pathname = usePathname();

  const ADMIN_ONLY_TABS = new Set(["usuarios", "roles"]);

const visibleTabs = isDefaultAdmin
    ? TABS
    : TABS.filter(
        (tab) =>
          !ADMIN_ONLY_TABS.has(tab.tab) && allowedTabs.includes(tab.tab),
      );

  return (
    <nav aria-label="Secciones del panel" className="flex flex-wrap items-center gap-1 md:gap-2">
      {visibleTabs.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-sm px-3 py-2 text-caption transition-all md:text-nav-link ${
              active
                ? "font-semibold text-ink after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-primary"
                : "font-medium text-muted hover:bg-cream-strong hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

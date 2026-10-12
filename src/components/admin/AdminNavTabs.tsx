"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/propiedades", label: "Propiedades" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/destinatarios", label: "Destinatarios" },
] as const;

/**
 * Admin sub-nav: `usePathname` is client-only state, so the active tab
 * (bold + underline per design tokens) lives in a client component.
 * "Gastos" points to the /admin/gastos placeholder (PR4) as a plain
 * anchor, per the delivery note.
 */
export function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del panel" className="flex items-center gap-6">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`text-button-md underline-offset-8 hover:underline ${
              active
                ? "font-semibold text-ink underline"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <a
        href="/admin/gastos"
        className="text-button-md text-muted hover:underline"
      >
        Gastos
      </a>
    </nav>
  );
}

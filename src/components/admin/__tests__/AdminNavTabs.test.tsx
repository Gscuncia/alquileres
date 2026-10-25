import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUsePathname = vi.fn(() => "/admin");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AdminNavTabs } from "@/components/admin/AdminNavTabs";

const ALL_TAB_LABELS = [
  "Panel",
  "Calendario",
  "Propiedades",
  "Reservas",
  "Huéspedes",
  "Destinatarios",
  "Gastos",
  "Contexto",
  "Feriados",
  "Usuarios",
  "Roles",
];

describe("AdminNavTabs", () => {
  afterEach(() => {
    mockUsePathname.mockReturnValue("/admin");
  });

  it("renders all tabs for a default admin", () => {
    render(<AdminNavTabs allowedTabs={[]} isDefaultAdmin />);

    for (const label of ALL_TAB_LABELS) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders only allowed tabs for a restricted role", () => {
    render(<AdminNavTabs allowedTabs={["calendario", "gastos"]} />);

    expect(screen.getByRole("link", { name: "Calendario" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gastos" })).toBeInTheDocument();

    for (const label of ["Panel", "Propiedades", "Reservas", "Huéspedes", "Destinatarios"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("renders nothing when a user has no allowed tabs and is not admin", () => {
    render(<AdminNavTabs allowedTabs={[]} />);

    for (const label of ALL_TAB_LABELS) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("marks the current tab as active", () => {
    mockUsePathname.mockReturnValue("/admin/calendario");

    render(<AdminNavTabs allowedTabs={["calendario"]} />);

    const active = screen.getByRole("link", { name: "Calendario" });
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("hides Usuarios and Roles from non-admin users even if they are in allowedTabs", () => {
    render(<AdminNavTabs allowedTabs={["usuarios", "roles"]} />);

    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles" })).not.toBeInTheDocument();
  });

  it("renders Contexto for a restricted role with the tab allowed", () => {
    render(<AdminNavTabs allowedTabs={["contexto"]} />);

    expect(screen.getByRole("link", { name: "Contexto" })).toBeInTheDocument();
    // Unlike usuarios/roles, Contexto is not admin-only.
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("shows Usuarios and Roles for default admins", () => {
    render(<AdminNavTabs allowedTabs={[]} isDefaultAdmin />);

    expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles" })).toBeInTheDocument();
  });
});

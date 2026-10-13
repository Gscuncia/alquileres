import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";

const mockAuth = vi.fn();
const mockUsePathname = vi.fn(() => "/admin");
const mockRedirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/components/auth/signout-button", () => ({
  SignOutButton: () => <button type="button">Cerrar sesión</button>,
}));

describe("AdminLayout", () => {
  it("renders navigation, user info, and logout for an authenticated admin", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "admin@alquileresanita.com.ar",
        role: "ADMIN",
      },
    });

    render(await AdminLayout({ children: <div>Dashboard content</div> }));

    expect(screen.getByRole("heading", { name: /admin/i })).toBeInTheDocument();
    expect(
      screen.getByText(/admin@alquileresanita.com.ar · admin/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/dashboard content/i)).toBeInTheDocument();

    // Sub-nav tabs: Panel · Calendario · Propiedades · Reservas · Huéspedes · Destinatarios · Gastos.
    const nav = screen.getByRole("navigation", {
      name: /secciones del panel/i,
    });
    for (const tab of ["Panel", "Calendario", "Propiedades", "Reservas", "Huéspedes", "Destinatarios", "Gastos"]) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
    expect(
      screen.getByText("Panel").closest("a"),
    ).toHaveAttribute("href", "/admin");
    expect(
      screen.getByText("Calendario").closest("a"),
    ).toHaveAttribute("href", "/admin/calendario");
    expect(
      screen.getByText("Reservas").closest("a"),
    ).toHaveAttribute("href", "/admin/reservas");
    expect(
      screen.getByText("Gastos").closest("a"),
    ).toHaveAttribute("href", "/admin/gastos");
    expect(nav).toBeInTheDocument();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: <div>Dashboard content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT /auth/signin");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  userFindMany: vi.fn(),
  roleFindMany: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requirePermission: (tab?: string) => mocks.requirePermission(tab),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mocks.userFindMany,
    },
    role: {
      findMany: mocks.roleFindMany,
    },
  },
}));

vi.mock("@/components/admin/UserForm", () => ({
  UserForm: () => <div data-testid="user-form" />,
}));

import UsuariosPage from "@/app/admin/usuarios/page";

const adminRole = { id: "role-1", name: "Administrador", allowedTabs: ["*"] };
const operativeRole = { id: "role-2", name: "Gestion diaria", allowedTabs: ["calendario", "gastos"] };

const users = [
  {
    id: "user-1",
    email: "admin@alquileresanita.com.ar",
    name: null,
    firstName: "Ana",
    lastName: "García",
    role: adminRole,
  },
  {
    id: "user-2",
    email: "operative@alquileresanita.com.ar",
    name: "Operario Principal",
    firstName: null,
    lastName: null,
    role: operativeRole,
  },
];

describe("UsuariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", isDefaultAdmin: true },
    });
    mocks.userFindMany.mockResolvedValue(users);
    mocks.roleFindMany.mockResolvedValue([adminRole, operativeRole]);
  });

  it("requires the usuarios tab permission", async () => {
    render(await UsuariosPage({ searchParams: {} }));

    expect(mocks.requirePermission).toHaveBeenCalledWith("usuarios");
  });

  it("lists users with email, full name, and role", async () => {
    render(await UsuariosPage({ searchParams: {} }));

    expect(screen.getByRole("heading", { name: "Usuarios" })).toBeInTheDocument();

    const adminRow = screen.getByText("admin@alquileresanita.com.ar").closest("tr");
    expect(adminRow).toHaveTextContent("Ana García");
    expect(adminRow).toHaveTextContent("Administrador");

    const operativeRow = screen.getByText("operative@alquileresanita.com.ar").closest("tr");
    expect(operativeRow).toHaveTextContent("Operario Principal");
    expect(operativeRow).toHaveTextContent("Gestion diaria");
  });

  it("renders the create-user form stub", async () => {
    render(await UsuariosPage({ searchParams: {} }));

    expect(screen.getByTestId("user-form")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    mocks.userFindMany.mockResolvedValue([]);

    render(await UsuariosPage({ searchParams: {} }));

    expect(
      screen.getByText(/todavía no hay usuarios cargados/i),
    ).toBeInTheDocument();
  });

  it("shows the unauthorized banner for ?error=no-autorizado", async () => {
    render(await UsuariosPage({ searchParams: { error: "no-autorizado" } }));

    expect(
      screen.getByText(/no tenés permisos para realizar esa acción/i),
    ).toBeInTheDocument();
  });
});

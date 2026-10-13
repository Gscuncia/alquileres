import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  roleFindMany: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requirePermission: (tab?: string) => mocks.requirePermission(tab),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: {
      findMany: mocks.roleFindMany,
    },
  },
}));

vi.mock("@/components/admin/RoleForm", () => ({
  RoleForm: ({ initialValues }: { initialValues?: { name: string } }) => (
    <div data-testid="role-form">
      {initialValues ? `Editing: ${initialValues.name}` : "Creating role"}
    </div>
  ),
}));

import RolesPage from "@/app/admin/roles/page";

const roles = [
  {
    id: "role-1",
    name: "Administrador",
    allowedTabs: ["panel", "calendario", "propiedades", "reservas", "huespedes", "destinatarios", "gastos"],
  },
  {
    id: "role-2",
    name: "Gestion diaria",
    allowedTabs: ["calendario", "gastos"],
  },
];

describe("RolesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", isDefaultAdmin: true },
    });
    mocks.roleFindMany.mockResolvedValue(roles);
  });

  it("requires the roles tab permission", async () => {
    render(await RolesPage({ searchParams: {} }));

    expect(mocks.requirePermission).toHaveBeenCalledWith("roles");
  });

  it("lists roles with their allowed tab labels", async () => {
    render(await RolesPage({ searchParams: {} }));

    expect(screen.getByRole("heading", { name: "Roles" })).toBeInTheDocument();

    const adminRow = screen.getByText("Administrador").closest("tr");
    expect(adminRow).toHaveTextContent("Panel");
    expect(adminRow).toHaveTextContent("Calendario");
    expect(adminRow).toHaveTextContent("Gastos");

    const operativeRow = screen.getByText("Gestion diaria").closest("tr");
    expect(operativeRow).toHaveTextContent("Calendario");
    expect(operativeRow).toHaveTextContent("Gastos");
  });

  it("renders the create-role form stub", async () => {
    render(await RolesPage({ searchParams: {} }));

    expect(screen.getByTestId("role-form")).toHaveTextContent("Creating role");
  });

  it("enters edit mode for ?rol=<id>", async () => {
    render(await RolesPage({ searchParams: { rol: "role-2" } }));

    expect(screen.getByText("Editar rol")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancelar edición" })).toHaveAttribute("href", "/admin/roles");
    expect(screen.getByTestId("role-form")).toHaveTextContent("Editing: Gestion diaria");
  });

  it("shows an empty state when there are no roles", async () => {
    mocks.roleFindMany.mockResolvedValue([]);

    render(await RolesPage({ searchParams: {} }));

    expect(
      screen.getByText(/todavía no hay roles cargados/i),
    ).toBeInTheDocument();
  });

  it("shows the unauthorized banner for ?error=no-autorizado", async () => {
    render(await RolesPage({ searchParams: { error: "no-autorizado" } }));

    expect(
      screen.getByText(/no tenés permisos para realizar esa acción/i),
    ).toBeInTheDocument();
  });
});

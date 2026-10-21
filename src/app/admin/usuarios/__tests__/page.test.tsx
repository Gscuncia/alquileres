import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  userFindMany: vi.fn(),
  roleFindMany: vi.fn(),
  getContactSettings: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requirePermission: (tab?: string) => mocks.requirePermission(tab),
}));

vi.mock("@/lib/site-settings", () => ({
  getContactSettings: () => mocks.getContactSettings(),
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

vi.mock("@/components/admin/ContactSettingsForm", () => ({
  ContactSettingsForm: ({
    initialInquiryEmail,
    initialWhatsappPhone,
    initialBackupEmail,
  }: {
    initialInquiryEmail: string;
    initialWhatsappPhone: string;
    initialBackupEmail: string;
  }) => (
    <div data-testid="contact-settings-form">
      <input data-testid="inquiry-email-input" defaultValue={initialInquiryEmail} readOnly />
      <input data-testid="whatsapp-phone-input" defaultValue={initialWhatsappPhone} readOnly />
      <input data-testid="backup-email-input" defaultValue={initialBackupEmail} readOnly />
    </div>
  ),
}));

vi.mock("@/components/admin/DeleteUserButton", () => ({
  DeleteUserButton: ({ userId }: { userId: string }) => (
    <button type="button" data-testid={`delete-user-${userId}`}>
      Eliminar
    </button>
  ),
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
    mocks.getContactSettings.mockResolvedValue({
      inquiryEmail: "contacto@alquileresanita.com.ar",
      whatsappPhone: "5491155052228",
      backupEmail: "backups@alquileresanita.com.ar",
    });
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

  it("renders a delete button for users other than the current one", async () => {
    render(await UsuariosPage({ searchParams: {} }));

    expect(
      screen.getByTestId("delete-user-user-2"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("delete-user-user-1"),
    ).not.toBeInTheDocument();
  });

  it("renders the contact settings panel with prefilled inputs", async () => {
    render(await UsuariosPage({ searchParams: {} }));

    expect(
      screen.getByRole("heading", { name: "Configuración de contacto" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("contact-settings-form")).toBeInTheDocument();

    const inquiryInput = screen.getByTestId("inquiry-email-input") as HTMLInputElement;
    expect(inquiryInput.value).toBe("contacto@alquileresanita.com.ar");

    const whatsappInput = screen.getByTestId("whatsapp-phone-input") as HTMLInputElement;
    expect(whatsappInput.value).toBe("5491155052228");

    const backupInput = screen.getByTestId("backup-email-input") as HTMLInputElement;
    expect(backupInput.value).toBe("backups@alquileresanita.com.ar");
  });
});

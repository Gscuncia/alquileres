import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  expenseFindMany: vi.fn(),
  expenseFindUnique: vi.fn(),
  expenseTypeFindMany: vi.fn(),
  getProperties: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      findMany: mocks.expenseFindMany,
      findUnique: mocks.expenseFindUnique,
    },
    expenseType: {
      findMany: mocks.expenseTypeFindMany,
    },
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

// Plain react-dom 18.3.1 lacks useFormState (Next 14's vendored copy has it);
// the form components themselves are covered by their own concerns — the
// page test stubs them, mirroring the property-form test stub.
vi.mock("@/components/admin/ExpenseForm", () => ({
  ExpenseForm: () => <div data-testid="expense-form" />,
}));

vi.mock("@/components/admin/ExpenseTypeForm", () => ({
  ExpenseTypeForm: () => <div data-testid="expense-type-form" />,
}));

import GastosPage from "@/app/admin/gastos/page";
import { toUtc } from "@/lib/datetime";

const properties = [
  { id: "p-1", title: "Depto 1", slug: "depto-1", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 2, bedrooms: 1, bathrooms: 1, published: true, sortOrder: 1 },
  { id: "p-2", title: "Casita", slug: "casita", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 4, bedrooms: 2, bathrooms: 1, published: true, sortOrder: 2 },
];

const typeMant = { id: "t-mant", name: "Mantenimiento", requiresProperty: true };
const typeCons = { id: "t-cons", name: "Consorcio", requiresProperty: false };

const expenses = [
  {
    id: "e-1",
    propertyId: "p-1",
    property: { id: "p-1", title: "Depto 1" },
    expenseTypeId: "t-mant",
    expenseType: typeMant,
    category: "Plomería",
    description: "Cambio de grifería",
    amount: 150,
    date: toUtc("2026-10-03", "00:00"),
    createdByUserId: "user-1",
    createdBy: { name: "Juan" },
  },
  {
    id: "e-2",
    propertyId: null,
    property: null,
    expenseTypeId: "t-cons",
    expenseType: typeCons,
    category: "Expensas",
    description: null,
    amount: 200,
    date: toUtc("2026-10-05", "00:00"),
    createdByUserId: null,
    createdBy: null,
  },
];

describe("GastosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.getProperties.mockResolvedValue(properties);
    mocks.expenseTypeFindMany.mockResolvedValue([typeMant, typeCons]);
    mocks.expenseFindMany.mockResolvedValue(expenses);
    mocks.expenseFindUnique.mockResolvedValue(null);
  });

  it("renders the types manager inline section with its form and type rows", async () => {
    render(await GastosPage({ searchParams: {} }));

    expect(screen.getByText("Tipos de gasto")).toBeInTheDocument();
    expect(screen.getByTestId("expense-type-form")).toBeInTheDocument();
    // Each row: name + "Requiere propiedad" badge for requiresProperty types.
    expect(screen.getAllByText("Mantenimiento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Consorcio").length).toBeGreaterThan(0);
    expect(screen.getByText("Requiere propiedad")).toBeInTheDocument();
  });

  it("lists expenses with type name replacing the enum label and property or General", async () => {
    render(await GastosPage({ searchParams: {} }));

    // No filters → no where clause, all rows, newest first.
    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
        include: {
          property: true,
          expenseType: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      }),
    );

    const mantRow = screen.getByText("Plomería").closest("tr");
    expect(mantRow).toHaveTextContent("Mantenimiento");
    expect(mantRow).toHaveTextContent("Depto 1");
    expect(mantRow).toHaveTextContent("150");
    expect(mantRow).toHaveTextContent("Cambio de grifería");
    expect(mantRow).toHaveTextContent("Juan");

    const consRow = screen.getByText("Expensas").closest("tr");
    expect(consRow).toHaveTextContent("General");
    expect(consRow).toHaveTextContent("—");
  });

  it("shows the Cargado por column header and falls back to the raw user id", async () => {
    mocks.expenseFindMany.mockResolvedValue([
      {
        ...expenses[0],
        createdByUserId: "user-42",
        createdBy: null,
      },
    ]);

    render(await GastosPage({ searchParams: {} }));

    expect(screen.getByText("Cargado por")).toBeInTheDocument();
    expect(screen.getByText("user-42")).toBeInTheDocument();
  });

  it("renders no create-expense form outside edit mode (creation lives in Carga Gastos)", async () => {
    render(await GastosPage({ searchParams: {} }));

    expect(screen.queryByTestId("expense-form")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Nuevo gasto$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Editar gasto$/)).not.toBeInTheDocument();
  });

  it("type rows offer Editar via ?tipo=<id> and delete via ConfirmButton form", async () => {
    render(await GastosPage({ searchParams: {} }));

    expect(
      screen.getAllByRole("link", { name: "Editar" }).find(
        (link) => link.getAttribute("href") === `/admin/gastos?tipo=${typeMant.id}`,
      ),
    ).toBeDefined();
  });

  it("combine filters by type id + property + period combinable in the where clause", async () => {
    render(
      await GastosPage({
        searchParams: { tipo: typeCons.id, propiedad: "p-1", from: "2026-10-01", to: "2026-10-31" },
      }),
    );

    const call = mocks.expenseFindMany.mock.calls[0][0];
    expect(call.where).toEqual({
      expenseTypeId: typeCons.id,
      propertyId: "p-1",
      date: {
        gte: toUtc("2026-10-01", "00:00"),
        lt: toUtc("2026-10-31", "00:00"),
      },
    });
  });

  it("ignores an unknown ?tipo id (not among the fetched types) instead of erroring", async () => {
    render(await GastosPage({ searchParams: { tipo: "t-inexistente" } }));

    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it("shows the filters-empty and no-data empty states", async () => {
    mocks.expenseFindMany.mockResolvedValue([]);

    render(await GastosPage({ searchParams: { tipo: typeCons.id } }));
    expect(screen.getByText(/no hay gastos que coincidan/i)).toBeInTheDocument();
    cleanup();

    render(await GastosPage({ searchParams: {} }));
    expect(
      screen.getByText(/todavía no hay gastos cargados/i),
    ).toBeInTheDocument();
  });

  it("enters edit mode for ?gasto=<id> and passes the expense to the form", async () => {
    mocks.expenseFindUnique.mockResolvedValue(expenses[0]);

    render(await GastosPage({ searchParams: { gasto: "e-1" } }));

    expect(mocks.expenseFindUnique).toHaveBeenCalledWith({
      where: { id: "e-1" },
    });
    expect(screen.getByTestId("expense-form")).toBeInTheDocument();
    expect(screen.getByText("Editar gasto")).toBeInTheDocument();
    expect(screen.getByText("Cancelar edición")).toBeInTheDocument();
    // Unedited state would read "Nuevo gasto".
    expect(screen.queryByText(/^Nuevo gasto$/)).not.toBeInTheDocument();
  });

  it("renders no expense form when an unknown ?gasto id is given", async () => {
    mocks.expenseFindUnique.mockResolvedValue(null);

    render(await GastosPage({ searchParams: { gasto: "desconocido" } }));

    expect(screen.queryByTestId("expense-form")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Nuevo gasto$/)).not.toBeInTheDocument();
  });

  it("links the header action to the Carga Gastos tab", async () => {
    render(await GastosPage({ searchParams: {} }));

    expect(
      screen.getByRole("link", { name: "Cargar gasto" }),
    ).toHaveAttribute("href", "/admin/carga-gastos");
  });

  it("selects a type for editing via ?tipo=<id>: type form in edit mode + Cancelar edición", async () => {
    render(await GastosPage({ searchParams: { tipo: typeMant.id } }));

    expect(screen.getByText("Cancelar edición")).toBeInTheDocument();
    expect(screen.getByText("Tipos de gasto")).toBeInTheDocument();
  });

  it("shows the guard banner when a type delete was blocked (?error=tipo-gastos)", async () => {
    render(await GastosPage({ searchParams: { error: "tipo-gastos" } }));

    expect(
      screen.getByText(
        /No se puede eliminar: el tipo de gasto tiene gastos asociados./i,
      ),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  expenseFindMany: vi.fn(),
  expenseFindUnique: vi.fn(),
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
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

// Plain react-dom 18.3.1 lacks useFormState (Next 14's vendored copy has it);
// the form component itself is covered by its own concerns — the page test
// stubs it, mirroring the property-form test stub from PR2.
vi.mock("@/components/admin/ExpenseForm", () => ({
  ExpenseForm: () => <div data-testid="expense-form" />,
}));

import GastosPage from "@/app/admin/gastos/page";
import { toUtc } from "@/lib/datetime";

const properties = [
  { id: "p-1", title: "Depto 1", slug: "depto-1", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 2, bedrooms: 1, bathrooms: 1, published: true, sortOrder: 1 },
  { id: "p-2", title: "Casita", slug: "casita", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 4, bedrooms: 2, bathrooms: 1, published: true, sortOrder: 2 },
];

const expenses = [
  {
    id: "e-1",
    propertyId: "p-1",
    property: { id: "p-1", title: "Depto 1" },
    type: "MANTENIMIENTO" as const,
    category: "Plomería",
    description: "Cambio de grifería",
    amount: 150,
    date: toUtc("2026-10-03", "00:00"),
  },
  {
    id: "e-2",
    propertyId: null,
    property: null,
    type: "CONSORCIO" as const,
    category: "Expensas",
    description: null,
    amount: 200,
    date: toUtc("2026-10-05", "00:00"),
  },
];

describe("GastosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.getProperties.mockResolvedValue(properties);
    mocks.expenseFindMany.mockResolvedValue(expenses);
    mocks.expenseFindUnique.mockResolvedValue(null);
  });

  it("lists expenses with type, property (general for consorcio), category, amount, date, and description", async () => {
    render(await GastosPage({ searchParams: {} }));

    // No filters → no where clause, all rows, newest first.
    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, orderBy: { date: "desc" } }),
    );

    const mantRow = screen.getByText("Plomería").closest("tr");
    expect(mantRow).toHaveTextContent("Mantenimiento");
    expect(mantRow).toHaveTextContent("Depto 1");
    expect(mantRow).toHaveTextContent("150");
    expect(mantRow).toHaveTextContent("Cambio de grifería");

    const consRow = screen.getByText("Expensas").closest("tr");
    expect(consRow).toHaveTextContent("Consorcio");
    expect(consRow).toHaveTextContent("General");

    // Edit link follows the ?gasto=<id> edit pattern (agenda: ?reserva=).
    expect(
      screen.getAllByRole("link", { name: /editar/i })[0],
    ).toHaveAttribute("href", "/admin/gastos?gasto=e-1");
  });

  it("filters by type and property through the where clause", async () => {
    render(await GastosPage({ searchParams: { tipo: "CONSORCIO", propiedad: "p-1" } }));

    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "CONSORCIO", propertyId: "p-1" },
      }),
    );
  });

  it("filters by period [from, to) with UTC-3 instants", async () => {
    render(
      await GastosPage({ searchParams: { from: "2026-10-01", to: "2026-10-15" } }),
    );

    const call = mocks.expenseFindMany.mock.calls[0][0];
    expect(call.where.date.gte.toISOString()).toBe(
      toUtc("2026-10-01", "00:00").toISOString(),
    );
    expect(call.where.date.lt.toISOString()).toBe(
      toUtc("2026-10-15", "00:00").toISOString(),
    );
  });

  it("ignores invalid filters instead of erroring", async () => {
    render(
      await GastosPage({
        searchParams: { from: "no-es-fecha", tipo: "OTRO", propiedad: "   " },
      }),
    );

    expect(mocks.expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it("shows the filters-empty and no-data empty states", async () => {
    mocks.expenseFindMany.mockResolvedValue([]);

    render(await GastosPage({ searchParams: { tipo: "CONSORCIO" } }));
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
    expect(screen.getByText("Editar gasto")).toBeInTheDocument();
    expect(screen.getByText("Cancelar edición")).toBeInTheDocument();
    // Unedited state would read "Nuevo gasto".
    expect(screen.queryByText(/^Nuevo gasto$/)).not.toBeInTheDocument();
  });

  it("keeps the create form when an unknown ?gasto id is given", async () => {
    mocks.expenseFindUnique.mockResolvedValue(null);

    render(await GastosPage({ searchParams: { gasto: "desconocido" } }));

    expect(screen.getByText(/^Nuevo gasto$/)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  expenseTypeFindMany: vi.fn(),
  getProperties: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expenseType: {
      findMany: mocks.expenseTypeFindMany,
    },
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

// The page test stubs the client form component, mirroring the gastos page
// test: the form's own concerns are covered by its dedicated tests.
vi.mock("@/components/admin/ExpenseForm", () => ({
  ExpenseForm: ({
    action,
    submitLabel,
  }: {
    action: unknown;
    submitLabel?: string;
  }) => (
    <div
      data-testid="expense-form"
      data-action={action === "createExpense" ? "create" : "other"}
      data-submit-label={submitLabel}
    />
  ),
}));

vi.mock("@/app/admin/expenses/actions", () => ({
  createExpense: "createExpense",
}));

import CargaGastosPage from "@/app/admin/carga-gastos/page";

const properties = [
  { id: "p-1", title: "Depto 1", slug: "depto-1", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 2, bedrooms: 1, bathrooms: 1, published: true, sortOrder: 1 },
];

const types = [
  { id: "t-mant", name: "Mantenimiento", requiresProperty: true },
  { id: "t-cons", name: "Consorcio", requiresProperty: false },
];

describe("CargaGastosPage", () => {
  it("renders only the header and the create-expense form", async () => {
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.expenseTypeFindMany.mockResolvedValue(types);
    mocks.getProperties.mockResolvedValue(properties);

    const { container } = render(await CargaGastosPage());

    expect(screen.getByRole("heading", { name: "Carga Gastos" })).toBeInTheDocument();
    expect(screen.getByText(/formulario para cargar un nuevo gasto/i)).toBeInTheDocument();
    const form = screen.getByTestId("expense-form");
    expect(form).toBeInTheDocument();
    // The create action and the types/properties data are wired through.
    expect(form).toHaveAttribute("data-action", "create");
    expect(form).toHaveAttribute("data-submit-label", "Crear gasto");

    // Nothing else from the gastos page (no filters, no table).
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("form[method='get']")).toBeNull();

    // Types are fetched in name order like the gastos page does.
    expect(mocks.expenseTypeFindMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  expenseCreate: vi.fn(),
  expenseUpdate: vi.fn(),
  expenseDelete: vi.fn(),
  expenseFindUnique: vi.fn(),
  expenseCount: vi.fn(),
  typeFindUnique: vi.fn(),
  typeCreate: vi.fn(),
  typeUpdate: vi.fn(),
  typeDelete: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      create: mocks.expenseCreate,
      update: mocks.expenseUpdate,
      delete: mocks.expenseDelete,
      findUnique: mocks.expenseFindUnique,
      count: mocks.expenseCount,
    },
    expenseType: {
      findUnique: mocks.typeFindUnique,
      create: mocks.typeCreate,
      update: mocks.typeUpdate,
      delete: mocks.typeDelete,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidatePath(path),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mocks.redirect(path),
}));

import {
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseType,
  updateExpenseType,
  deleteExpenseType,
} from "@/app/admin/expenses/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

/** Seed rows for the type lookups. */
const maintenanceType = { id: "t-mant", name: "Mantenimiento", requiresProperty: true };
const generalType = { id: "t-cons", name: "Consorcio", requiresProperty: false };

function buildFormData(overrides: Record<string, string | number> = {}): FormData {
  const defaults: Record<string, string> = {
    typeId: "t-mant",
    propertyId: "p-1",
    category: "Plomería",
    description: "Reparación",
    amount: "150",
    date: "2026-10-03",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, String(value));
  }
  return formData;
}

function buildTypeFormData(overrides: Record<string, string | number> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(overrides)) {
    formData.append(key, String(value));
  }
  return formData;
}

describe("expense actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN", isDefaultAdmin: true },
    });
    mocks.expenseCreate.mockResolvedValue({});
    mocks.expenseUpdate.mockResolvedValue({});
    mocks.expenseDelete.mockResolvedValue({});
    mocks.expenseFindUnique.mockResolvedValue({ id: "e-1" });
    mocks.expenseCount.mockResolvedValue(0);
    mocks.typeCreate.mockResolvedValue({});
    mocks.typeUpdate.mockResolvedValue({});
    mocks.typeDelete.mockResolvedValue({});
    mocks.typeFindUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === "t-mant") return Promise.resolve(maintenanceType);
        if (where.id === "t-cons") return Promise.resolve(generalType);
        return Promise.resolve(null);
      },
    );
  });

  describe("authorization", () => {
    it("throws 'No autorizado' when the caller is not an admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", role: "OPERATIVE", isDefaultAdmin: false },
      });

      await expect(
        createExpense(initialState, buildFormData()),
      ).rejects.toThrow("No autorizado");
      expect(mocks.expenseCreate).not.toHaveBeenCalled();
    });

    it("throws when there is no session", async () => {
      mocks.auth.mockResolvedValue(null);

      await expect(
        createExpense(initialState, buildFormData()),
      ).rejects.toThrow("No autorizado");
    });

    it("update and delete also run the admin gate first", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", role: "OPERATIVE", isDefaultAdmin: false },
      });

      await expect(
        updateExpense(initialState, buildFormData({ id: "e-1" })),
      ).rejects.toThrow("No autorizado");

      await expect(
        deleteExpense(buildFormData({ id: "e-1" })),
      ).rejects.toThrow("No autorizado");

      await expect(
        createExpenseType(initialState, buildTypeFormData({ name: "X" })),
      ).rejects.toThrow("No autorizado");

      await expect(
        deleteExpenseType(buildFormData({ id: "t-cons" })),
      ).rejects.toThrow("No autorizado");

      expect(mocks.expenseUpdate).not.toHaveBeenCalled();
      expect(mocks.expenseDelete).not.toHaveBeenCalled();
      expect(mocks.typeCreate).not.toHaveBeenCalled();
      expect(mocks.typeDelete).not.toHaveBeenCalled();
    });
  });

  describe("createExpense", () => {
    it("requires tipo de gasto: empty typeId is a Spanish field error before any DB write", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ typeId: "" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.typeId).toBe(
        "El tipo de gasto es obligatorio.",
      );
      expect(mocks.expenseCreate).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects unknown typeId with El tipo de gasto no existe., creating nothing", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ typeId: "t-desconocido" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.typeId).toBe("El tipo de gasto no existe.");
      expect(mocks.expenseCreate).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("persists a requires-property expense linked to its expense type and property", async () => {
      const result = await createExpense(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(result.message).toMatch(/guardaron correctamente/i);
      expect(mocks.expenseCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expenseTypeId: "t-mant",
          propertyId: "p-1",
          category: "Plomería",
          amount: 150,
        }),
      });
    });

    it("property required for requiresProperty types: maintenance without property is rejected", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ propertyId: "" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.propertyId).toBe(
        "La propiedad es obligatoria para este tipo de gasto.",
      );
      expect(mocks.expenseCreate).not.toHaveBeenCalled();
    });

    it("property cleared for general types: consorcio never persists a property", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ typeId: "t-cons", propertyId: "p-1" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.expenseCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expenseTypeId: "t-cons",
          propertyId: null,
        }),
      });
    });

    it("rejects a non-numeric amount", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ amount: "not-a-number" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.amount).toMatch(/importe/i);
    });

    it("revalidates /admin/gastos and /admin", async () => {
      await createExpense(initialState, buildFormData());

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gastos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    });

    it("rethrows non-validation database errors", async () => {
      mocks.expenseCreate.mockRejectedValue(new Error("connection refused"));

      await expect(
        createExpense(initialState, buildFormData()),
      ).rejects.toThrow("connection refused");
    });
  });

  describe("updateExpense", () => {
    it("updates an existing expense", async () => {
      const result = await updateExpense(
        initialState,
        buildFormData({ id: "e-1", amount: "250" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.expenseUpdate).toHaveBeenCalledWith({
        where: { id: "e-1" },
        data: expect.objectContaining({ amount: 250 }),
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gastos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    });

    it("returns a not-found message for an unknown id", async () => {
      mocks.expenseFindUnique.mockResolvedValue(null);

      const result = await updateExpense(
        initialState,
        buildFormData({ id: "desconocido" }),
      );

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no encontrado/i);
      expect(mocks.expenseUpdate).not.toHaveBeenCalled();
    });

    it("clears the property when updating a requires-property expense to a general type", async () => {
      const result = await updateExpense(
        initialState,
        buildFormData({ id: "e-1", typeId: "t-cons", propertyId: "p-1" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.expenseUpdate).toHaveBeenCalledWith({
        where: { id: "e-1" },
        data: expect.objectContaining({ expenseTypeId: "t-cons", propertyId: null }),
      });
    });
  });

  describe("deleteExpense", () => {
    it("deletes the expense, revalidates, and redirects to the gastos list", async () => {
      await deleteExpense(buildFormData({ id: "e-1" }));

      expect(mocks.expenseDelete).toHaveBeenCalledWith({ where: { id: "e-1" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gastos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/gastos");
    });

    it("redirects without acting when the id is missing", async () => {
      await deleteExpense(new FormData());

      expect(mocks.expenseDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/gastos");
    });
  });

  describe("expense type CRUD", () => {
    it("creates a type with the checkbox flag", async () => {
      const result = await createExpenseType(
        initialState,
        buildTypeFormData({ name: "Limpieza", requiresProperty: "on" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.typeCreate).toHaveBeenCalledWith({
        data: { name: "Limpieza", requiresProperty: true },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gastos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    });

    it("unchecked checkbox persists requiresProperty false", async () => {
      await createExpenseType(initialState, buildTypeFormData({ name: "Luz" }));

      expect(mocks.typeCreate).toHaveBeenCalledWith({
        data: { name: "Luz", requiresProperty: false },
      });
    });

    it("type CRUD P2002 maps to El tipo de gasto ya existe. (create)", async () => {
      mocks.typeCreate.mockRejectedValue({ code: "P2002" });

      const result = await createExpenseType(
        initialState,
        buildTypeFormData({ name: "Mantenimiento" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toBe("El tipo de gasto ya existe.");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("type CRUD P2002 maps to El tipo de gasto ya existe. (update keeps id)", async () => {
      mocks.typeUpdate.mockRejectedValue({ code: "P2002" });

      const result = await updateExpenseType(
        initialState,
        buildTypeFormData({ id: "t-mant", name: "Consorcio", requiresProperty: "on" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toBe("El tipo de gasto ya existe.");
      expect(mocks.typeUpdate).toHaveBeenCalledWith({
        where: { id: "t-mant" },
        data: { name: "Consorcio", requiresProperty: true },
      });
    });

    it("rejects an empty type name, in Spanish", async () => {
      const result = await createExpenseType(
        initialState,
        buildTypeFormData({ name: "   " }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toMatch(/nombre/i);
      expect(mocks.typeCreate).not.toHaveBeenCalled();
    });

    it("update returns a not-found message for an unknown id", async () => {
      mocks.typeFindUnique.mockResolvedValue(null);

      const result = await updateExpenseType(
        initialState,
        buildTypeFormData({ id: "desconocido", name: "X" }),
      );

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no encontrado/i);
      expect(mocks.typeUpdate).not.toHaveBeenCalled();
    });

    it("deleteExpenseType blocked with tipo-gastos error when the type has expenses", async () => {
      mocks.expenseCount.mockResolvedValue(3);

      await deleteExpenseType(buildFormData({ id: "t-mant" }));

      expect(mocks.expenseCount).toHaveBeenCalledWith({
        where: { expenseTypeId: "t-mant" },
      });
      expect(mocks.typeDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/gastos?error=tipo-gastos");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("deleteExpenseType allowed when unused: deletes, revalidates, redirects", async () => {
      mocks.expenseCount.mockResolvedValue(0);

      await deleteExpenseType(buildFormData({ id: "t-luz" }));

      expect(mocks.typeDelete).toHaveBeenCalledWith({ where: { id: "t-luz" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/gastos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/gastos");
    });

    it("redirects without acting when the id is missing", async () => {
      await deleteExpenseType(new FormData());

      expect(mocks.expenseCount).not.toHaveBeenCalled();
      expect(mocks.typeDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/gastos");
    });

    it("rethrows non-conflict database errors", async () => {
      mocks.typeCreate.mockRejectedValue(new Error("connection refused"));

      await expect(
        createExpenseType(initialState, buildTypeFormData({ name: "X" })),
      ).rejects.toThrow("connection refused");
    });
  });
});

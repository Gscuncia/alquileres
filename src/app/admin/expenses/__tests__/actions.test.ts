import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  expenseCreate: vi.fn(),
  expenseUpdate: vi.fn(),
  expenseDelete: vi.fn(),
  expenseFindUnique: vi.fn(),
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
} from "@/app/admin/expenses/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string | number> = {}): FormData {
  const defaults: Record<string, string> = {
    type: "MANTENIMIENTO",
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

describe("expense actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.expenseCreate.mockResolvedValue({});
    mocks.expenseUpdate.mockResolvedValue({});
    mocks.expenseDelete.mockResolvedValue({});
    mocks.expenseFindUnique.mockResolvedValue({ id: "e-1" });
  });

  describe("authorization", () => {
    it("throws 'No autorizado' when the caller is not an admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", role: "OPERATIVE" },
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
        user: { id: "user-2", role: "OPERATIVE" },
      });

      await expect(
        updateExpense(initialState, buildFormData({ id: "e-1" })),
      ).rejects.toThrow("No autorizado");

      await expect(
        deleteExpense(buildFormData({ id: "e-1" })),
      ).rejects.toThrow("No autorizado");

      expect(mocks.expenseUpdate).not.toHaveBeenCalled();
      expect(mocks.expenseDelete).not.toHaveBeenCalled();
    });
  });

  describe("createExpense", () => {
    it("creates a maintenance expense linked to its property", async () => {
      const result = await createExpense(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(result.message).toMatch(/guardaron correctamente/i);
      expect(mocks.expenseCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "MANTENIMIENTO",
          propertyId: "p-1",
          category: "Plomería",
          amount: 150,
        }),
      });
    });

    it("persists a consorcio expense without a property even if one was submitted", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ type: "CONSORCIO", propertyId: "p-1" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.expenseCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "CONSORCIO",
          propertyId: null,
        }),
      });
    });

    it("rejects invalid input (maintenance without property) with Spanish field errors, creating nothing", async () => {
      const result = await createExpense(
        initialState,
        buildFormData({ propertyId: "" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.propertyId).toMatch(/mantenimiento.*propiedad|propiedad/i);
      expect(mocks.expenseCreate).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
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
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  holidayCreate: vi.fn(),
  holidayUpdate: vi.fn(),
  holidayDelete: vi.fn(),
  holidayFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    holiday: {
      create: mocks.holidayCreate,
      update: mocks.holidayUpdate,
      delete: mocks.holidayDelete,
      findUnique: mocks.holidayFindUnique,
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
  upsertHoliday,
  deleteHoliday,
} from "@/app/admin/holidays/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    date: "2026-12-25",
    notes: "Navidad",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, String(value));
  }
  return formData;
}

describe("holiday actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN", isDefaultAdmin: true },
    });
    mocks.holidayCreate.mockResolvedValue({ id: "h-new" });
    mocks.holidayUpdate.mockResolvedValue({});
    mocks.holidayDelete.mockResolvedValue({});
    mocks.holidayFindUnique.mockResolvedValue({ id: "h-1" });
  });

  describe("authorization", () => {
    it("throws 'No autorizado' when the caller is not an admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", role: "OPERATIVE", isDefaultAdmin: false },
      });

      await expect(
        upsertHoliday(initialState, buildFormData()),
      ).rejects.toThrow("No autorizado");
      expect(mocks.holidayCreate).not.toHaveBeenCalled();

      await expect(
        deleteHoliday(buildFormData({ id: "h-1" })),
      ).rejects.toThrow("No autorizado");
      expect(mocks.holidayDelete).not.toHaveBeenCalled();
    });

    it("throws when there is no session", async () => {
      mocks.auth.mockResolvedValue(null);

      await expect(
        upsertHoliday(initialState, buildFormData()),
      ).rejects.toThrow("No autorizado");
    });
  });

  describe("upsertHoliday — validation", () => {
    it("requires a date: empty date is a Spanish field error before any DB write", async () => {
      const result = await upsertHoliday(
        initialState,
        buildFormData({ date: "" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.date).toMatch(/fecha/i);
      expect(mocks.holidayCreate).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects a malformed date with La fecha no es válida.", async () => {
      const result = await upsertHoliday(
        initialState,
        buildFormData({ date: "25/12/2026" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.date).toBe("La fecha no es válida.");
      expect(mocks.holidayCreate).not.toHaveBeenCalled();
    });

    it("requires notes: blank observations are a Spanish field error before any DB write", async () => {
      const result = await upsertHoliday(
        initialState,
        buildFormData({ notes: "   " }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.notes).toMatch(/observaciones/i);
      expect(mocks.holidayCreate).not.toHaveBeenCalled();
    });
  });

  describe("upsertHoliday — create", () => {
    it("persists the holiday with a BA-midnight UTC date", async () => {
      const result = await upsertHoliday(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(result.message).toMatch(/guardaron correctamente/i);
      expect(mocks.holidayCreate).toHaveBeenCalledWith({
        data: {
          date: new Date("2026-12-25T00:00:00-03:00"),
          notes: "Navidad",
        },
      });
    });

    it("maps P2002 to Ya existe un feriado en esa fecha. without revalidating", async () => {
      mocks.holidayCreate.mockRejectedValue({ code: "P2002" });

      const result = await upsertHoliday(initialState, buildFormData());

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.date).toBe("Ya existe un feriado en esa fecha.");
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("rethrows non-conflict database errors", async () => {
      mocks.holidayCreate.mockRejectedValue(new Error("connection refused"));

      await expect(
        upsertHoliday(initialState, buildFormData()),
      ).rejects.toThrow("connection refused");
    });
  });

  describe("upsertHoliday — update", () => {
    it("updates an existing holiday and revalidates both paths", async () => {
      const result = await upsertHoliday(
        initialState,
        buildFormData({ id: "h-1", notes: "Navidad (feriado nacional)" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.holidayFindUnique).toHaveBeenCalledWith({
        where: { id: "h-1" },
        select: { id: true },
      });
      expect(mocks.holidayUpdate).toHaveBeenCalledWith({
        where: { id: "h-1" },
        data: {
          date: new Date("2026-12-25T00:00:00-03:00"),
          notes: "Navidad (feriado nacional)",
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/feriados");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/calendario");
    });

    it("returns a not-found message for an unknown id", async () => {
      mocks.holidayFindUnique.mockResolvedValue(null);

      const result = await upsertHoliday(
        initialState,
        buildFormData({ id: "desconocido" }),
      );

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no encontrado/i);
      expect(mocks.holidayUpdate).not.toHaveBeenCalled();
    });

    it("maps P2002 to Ya existe un feriado en esa fecha. when the new date is taken", async () => {
      mocks.holidayUpdate.mockRejectedValue({ code: "P2002" });

      const result = await upsertHoliday(
        initialState,
        buildFormData({ id: "h-1" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.date).toBe("Ya existe un feriado en esa fecha.");
    });
  });

  describe("deleteHoliday", () => {
    it("deletes the holiday, revalidates, and redirects to the feriados list", async () => {
      await deleteHoliday(buildFormData({ id: "h-1" }));

      expect(mocks.holidayDelete).toHaveBeenCalledWith({ where: { id: "h-1" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/feriados");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/calendario");
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/feriados");
    });

    it("redirects without acting when the id is missing", async () => {
      await deleteHoliday(new FormData());

      expect(mocks.holidayDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/feriados");
    });
  });
});

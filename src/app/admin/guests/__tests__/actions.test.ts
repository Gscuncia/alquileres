import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  guestCreate: vi.fn(),
  guestUpdate: vi.fn(),
  guestFindUnique: vi.fn(),
  guestDelete: vi.fn(),
  bookingCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guest: {
      create: mocks.guestCreate,
      update: mocks.guestUpdate,
      delete: mocks.guestDelete,
      findUnique: mocks.guestFindUnique,
    },
    booking: {
      count: mocks.bookingCount,
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
  createGuest,
  updateGuest,
  deleteGuest,
} from "@/app/admin/guests/actions";
import type { ActionState } from "@/lib/admin-action-types";

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const base: Record<string, string> = {
    firstName: "Juan",
    lastName: "Pérez",
    dni: "30123456",
    phone: "1551234567",
    email: "",
    notes: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    formData.append(key, value);
  }
  return formData;
}

const initialState: ActionState = { ok: false };

describe("guest actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN", isDefaultAdmin: true },
    });
    mocks.guestCreate.mockResolvedValue({});
    mocks.guestUpdate.mockResolvedValue({});
    mocks.guestDelete.mockResolvedValue({});
    mocks.guestFindUnique.mockResolvedValue({ id: "g-1" });
    mocks.bookingCount.mockResolvedValue(0);
  });

  it("throws 'No autorizado' when the caller is not an admin", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-2", email: "operative@alquileresanita.com.ar", role: "OPERATIVE", isDefaultAdmin: false },
    });

    await expect(
      createGuest(initialState, buildFormData()),
    ).rejects.toThrow("No autorizado");
    expect(mocks.guestCreate).not.toHaveBeenCalled();
  });

  it("create guest succeeds with valid data and revalidates the huespedes view", async () => {
    const result = await createGuest(initialState, buildFormData());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/guardaron correctamente/i);
    expect(mocks.guestCreate).toHaveBeenCalledWith({
      data: {
        firstName: "Juan",
        lastName: "Pérez",
        dni: "30123456",
        phone: "1551234567",
        email: undefined,
        notes: undefined,
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/huespedes");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects invalid data with Spanish field errors and creates nothing", async () => {
    const result = await createGuest(
      initialState,
      buildFormData({ dni: "123", email: "no-es-mail" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.dni).toMatch(/7 y 8 dígitos/);
    expect(result.fieldErrors?.email).toMatch(/formato válido/);
    expect(mocks.guestCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a duplicate dni on update to fieldErrors.dni 'El DNI ya existe.'", async () => {
    mocks.guestUpdate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["dni"] },
    });

    const result = await updateGuest(
      initialState,
      buildFormData({ id: "g-1", dni: "30123456" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.dni).toBe("El DNI ya existe.");
  });

  it("maps a duplicate dni on create to fieldErrors.dni 'El DNI ya existe.'", async () => {
    mocks.guestCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["dni"] },
    });

    const result = await createGuest(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.dni).toBe("El DNI ya existe.");
  });

  it("rethrows non-P2002 create errors", async () => {
    mocks.guestCreate.mockRejectedValue(new Error("connection refused"));

    await expect(createGuest(initialState, buildFormData())).rejects.toThrow(
      "connection refused",
    );
  });

  it("updates an existing guest", async () => {
    const result = await updateGuest(
      initialState,
      buildFormData({ id: "g-1", phone: "2231555555" }),
    );

    expect(result.ok).toBe(true);
    expect(mocks.guestUpdate).toHaveBeenCalledWith({
      where: { id: "g-1" },
      data: expect.objectContaining({ firstName: "Juan", phone: "2231555555" }),
    });
  });

  it("returns a not-found message when updating an unknown id", async () => {
    mocks.guestFindUnique.mockResolvedValue(null);

    const result = await updateGuest(
      initialState,
      buildFormData({ id: "desconocido" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no encontrado/i);
    expect(mocks.guestUpdate).not.toHaveBeenCalled();
  });

  describe("deleteGuest (delete guard)", () => {
    it("delete blocked when guest has bookings: redirect with Spanish banner, no delete", async () => {
      mocks.bookingCount.mockResolvedValue(2);
      const formData = buildFormData({ id: "g-1" });

      await deleteGuest(formData);

      expect(mocks.bookingCount).toHaveBeenCalledWith({
        where: { guestId: "g-1" },
      });
      expect(mocks.guestDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith(
        "/admin/huespedes?error=reservas",
      );
    });

    it("delete allowed when guest has zero bookings and revalidates", async () => {
      const formData = buildFormData({ id: "g-1" });

      await deleteGuest(formData);

      expect(mocks.bookingCount).toHaveBeenCalledWith({
        where: { guestId: "g-1" },
      });
      expect(mocks.guestDelete).toHaveBeenCalledWith({ where: { id: "g-1" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/huespedes");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/huespedes");
    });

    it("redirects without acting when the id is missing", async () => {
      await deleteGuest(new FormData());

      expect(mocks.bookingCount).not.toHaveBeenCalled();
      expect(mocks.guestDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/huespedes");
    });
  });
});

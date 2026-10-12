import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  recipientCreate: vi.fn(),
  recipientUpdate: vi.fn(),
  recipientFindUnique: vi.fn(),
  recipientDelete: vi.fn(),
  bookingCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transferRecipient: {
      create: mocks.recipientCreate,
      update: mocks.recipientUpdate,
      delete: mocks.recipientDelete,
      findUnique: mocks.recipientFindUnique,
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
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from "@/app/admin/recipients/actions";
import type { ActionState } from "@/lib/admin-action-types";

function buildFormData(name = "Pablo", overrides = {}): FormData {
  const formData = new FormData();
  formData.append("name", name);
  for (const [key, value] of Object.entries(overrides)) {
    formData.append(key, String(value));
  }
  return formData;
}

const initialState: ActionState = { ok: false };

describe("recipient actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.recipientCreate.mockResolvedValue({});
    mocks.recipientUpdate.mockResolvedValue({});
    mocks.recipientDelete.mockResolvedValue({});
    mocks.recipientFindUnique.mockResolvedValue({ id: "r-1", name: "Sonia" });
    mocks.bookingCount.mockResolvedValue(0);
  });

  it("throws 'No autorizado' when the caller is not an admin", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-2", email: "operative@alquileresanita.com.ar", role: "OPERATIVE" },
    });

    await expect(
      createRecipient(initialState, buildFormData()),
    ).rejects.toThrow("No autorizado");
    expect(mocks.recipientCreate).not.toHaveBeenCalled();
  });

  it("creates a recipient and revalidates the destinatarios view", async () => {
    const result = await createRecipient(initialState, buildFormData("Pablo"));

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/guardaron correctamente/i);
    expect(mocks.recipientCreate).toHaveBeenCalledWith({
      data: { name: "Pablo" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/destinatarios");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects an empty name with a Spanish field error and creates nothing", async () => {
    const result = await createRecipient(initialState, buildFormData(""));

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.name).toMatch(
      /El nombre del destinatario es obligatorio/i,
    );
    expect(mocks.recipientCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a name unique violation to fieldErrors.name with 'El destinatario ya existe'", async () => {
    mocks.recipientCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["name"] },
    });

    const result = await createRecipient(initialState, buildFormData("Sonia"));

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.name).toBe("El destinatario ya existe");
  });

  it("rethrows non-P2002 create errors", async () => {
    mocks.recipientCreate.mockRejectedValue(new Error("connection refused"));

    await expect(
      createRecipient(initialState, buildFormData()),
    ).rejects.toThrow("connection refused");
  });

  it("maps a name conflict on update to fieldErrors.name", async () => {
    mocks.recipientUpdate.mockRejectedValue({ code: "P2002", meta: { target: ["name"] } });

    const result = await updateRecipient(
      initialState,
      buildFormData("Sonia", { id: "r-1" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.name).toBe("El destinatario ya existe");
  });

  it("updates an existing recipient", async () => {
    const result = await updateRecipient(
      initialState,
      buildFormData("Sonia Martínez", { id: "r-1" }),
    );

    expect(result.ok).toBe(true);
    expect(mocks.recipientUpdate).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: { name: "Sonia Martínez" },
    });
  });

  it("returns a not-found message when updating an unknown id", async () => {
    mocks.recipientFindUnique.mockResolvedValue(null);

    const result = await updateRecipient(
      initialState,
      buildFormData("Alguien", { id: "desconocido" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no encontrado/i);
    expect(mocks.recipientUpdate).not.toHaveBeenCalled();
  });

  describe("deleteRecipient (delete guard)", () => {
    it("blocks deletion of a recipient with bookings via a Spanish error redirect", async () => {
      mocks.bookingCount.mockResolvedValue(3);
      const formData = buildFormData(undefined, { id: "r-1" });

      await deleteRecipient(formData);

      expect(mocks.bookingCount).toHaveBeenCalledWith({
        where: { transferRecipientId: "r-1" },
      });
      expect(mocks.recipientDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith(
        "/admin/destinatarios?error=reservas",
      );
    });

    it("deletes a recipient with zero bookings and revalidates", async () => {
      const formData = buildFormData(undefined, { id: "r-1" });

      await deleteRecipient(formData);

      expect(mocks.bookingCount).toHaveBeenCalledWith({
        where: { transferRecipientId: "r-1" },
      });
      expect(mocks.recipientDelete).toHaveBeenCalledWith({ where: { id: "r-1" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/destinatarios");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/destinatarios");
    });

    it("redirects without acting when the id is missing", async () => {
      await deleteRecipient(new FormData());

      expect(mocks.bookingCount).not.toHaveBeenCalled();
      expect(mocks.recipientDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/destinatarios");
    });
  });
});

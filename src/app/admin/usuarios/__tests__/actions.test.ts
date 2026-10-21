import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  userCreate: vi.fn(),
  userDelete: vi.fn(),
  roleFindUnique: vi.fn(),
  siteSettingsUpsert: vi.fn(),
  bcryptHash: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: mocks.userCreate,
      delete: mocks.userDelete,
    },
    role: {
      findUnique: mocks.roleFindUnique,
    },
    siteSettings: {
      upsert: mocks.siteSettingsUpsert,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) =>
    type === undefined
      ? mocks.revalidatePath(path)
      : mocks.revalidatePath(path, type),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: (password: string, rounds: number) => mocks.bcryptHash(password, rounds),
  },
}));

vi.mock("@/lib/mail", () => ({
  sendWelcomeEmail: (...args: [string, string]) => mocks.sendWelcomeEmail(...args),
}));

import { createUser, deleteUser, updateContactSettings } from "@/app/admin/usuarios/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    email: "new@alquileresanita.com.ar",
    firstName: "Juan",
    lastName: "Pérez",
    roleId: "role-2",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, value);
  }
  return formData;
}

describe("user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", isDefaultAdmin: true },
    });
    mocks.roleFindUnique.mockResolvedValue({ id: "role-2" });
    mocks.bcryptHash.mockResolvedValue("hashed-password");
    mocks.userCreate.mockResolvedValue({});
    mocks.sendWelcomeEmail.mockResolvedValue(undefined);
    mocks.siteSettingsUpsert.mockResolvedValue({});
  });

  describe("authorization", () => {
    it("throws 'No autorizado' when the caller is not a default admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", email: "operative@alquileresanita.com.ar", isDefaultAdmin: false },
      });

      await expect(createUser(initialState, buildFormData())).rejects.toThrow("No autorizado");
      expect(mocks.userCreate).not.toHaveBeenCalled();
    });

    it("throws 'No autorizado' when a non-admin tries to delete a user", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", email: "operative@alquileresanita.com.ar", isDefaultAdmin: false },
      });
      const formData = new FormData();
      formData.append("userId", "user-3");

      await expect(deleteUser(initialState, formData)).rejects.toThrow("No autorizado");
      expect(mocks.userDelete).not.toHaveBeenCalled();
    });

    it("throws when there is no session", async () => {
      mocks.auth.mockResolvedValue(null);

      await expect(createUser(initialState, buildFormData())).rejects.toThrow("No autorizado");
    });
  });

  describe("deleteUser", () => {
    it("prevents a user from deleting their own account", async () => {
      const formData = new FormData();
      formData.append("userId", "user-1");

      const result = await deleteUser(initialState, formData);

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/propio usuario/i);
      expect(mocks.userDelete).not.toHaveBeenCalled();
    });

    it("allows an admin to delete another user", async () => {
      mocks.userDelete.mockResolvedValue({});
      const formData = new FormData();
      formData.append("userId", "user-2");

      const result = await deleteUser(initialState, formData);

      expect(result.ok).toBe(true);
      expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-2" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
    });
  });

  describe("createUser", () => {
    it("rejects an empty email with a Spanish field error", async () => {
      const result = await createUser(initialState, buildFormData({ email: "" }));

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.email).toMatch(/email/i);
      expect(mocks.userCreate).not.toHaveBeenCalled();
    });

    it("rejects an empty first or last name", async () => {
      const noFirstName = await createUser(initialState, buildFormData({ firstName: "   " }));
      expect(noFirstName.ok).toBe(false);
      expect(noFirstName.fieldErrors?.firstName).toMatch(/nombre/i);

      const noLastName = await createUser(initialState, buildFormData({ lastName: "   " }));
      expect(noLastName.ok).toBe(false);
      expect(noLastName.fieldErrors?.lastName).toMatch(/apellido/i);
    });

    it("rejects an unknown roleId", async () => {
      mocks.roleFindUnique.mockResolvedValue(null);

      const result = await createUser(initialState, buildFormData());

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.roleId).toBe("El rol seleccionado no existe.");
      expect(mocks.userCreate).not.toHaveBeenCalled();
    });

    it("creates a user with the default password hashed and mustChangePassword true", async () => {
      const result = await createUser(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(mocks.bcryptHash).toHaveBeenCalledWith("anita1234", 10);
      expect(mocks.userCreate).toHaveBeenCalledWith({
        data: {
          email: "new@alquileresanita.com.ar",
          firstName: "Juan",
          lastName: "Pérez",
          roleId: "role-2",
          passwordHash: "hashed-password",
          mustChangePassword: true,
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
    });

    it("assigns exactly one role to the new user", async () => {
      const result = await createUser(initialState, buildFormData({ roleId: "role-3" }));

      expect(result.ok).toBe(true);
      const createCall = mocks.userCreate.mock.calls[0][0];
      expect(createCall.data.roleId).toBe("role-3");
      expect(createCall.data).not.toHaveProperty("roles");
      expect(createCall.data).not.toHaveProperty("role");
    });

    it("maps P2002 email conflicts to a Spanish field error", async () => {
      mocks.userCreate.mockRejectedValue({ code: "P2002" });

      const result = await createUser(initialState, buildFormData());

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.email).toBe("Ya existe un usuario con ese email.");
    });

    it("rethrows non-conflict database errors", async () => {
      mocks.userCreate.mockRejectedValue(new Error("connection refused"));

      await expect(createUser(initialState, buildFormData())).rejects.toThrow("connection refused");
    });

    it("sends a welcome email after creating the user", async () => {
      const result = await createUser(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(mocks.sendWelcomeEmail).toHaveBeenCalledWith(
        "new@alquileresanita.com.ar",
        "anita1234",
      );
    });

    it("still succeeds when the welcome email fails", async () => {
      mocks.sendWelcomeEmail.mockRejectedValue(new Error("SMTP unavailable"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await createUser(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        "[createUser] Failed to send welcome email:",
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });
  });

  describe("updateContactSettings", () => {
    function buildContactFormData(overrides: Record<string, string> = {}): FormData {
      const defaults: Record<string, string> = {
        inquiryEmail: "consultas@alquileresanita.com.ar",
        whatsappPhone: "5491155052228",
        backupEmail: "",
        backupHour: "8",
      };
      const formData = new FormData();
      for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
        formData.append(key, value);
      }
      return formData;
    }

    it("throws 'No autorizado' when the caller is not a default admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", email: "operative@alquileresanita.com.ar", isDefaultAdmin: false },
      });

      await expect(
        updateContactSettings(initialState, buildContactFormData()),
      ).rejects.toThrow("No autorizado");
      expect(mocks.siteSettingsUpsert).not.toHaveBeenCalled();
    });

    it("saves valid settings with the WhatsApp digits stripped and upserts the default row", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ whatsappPhone: "+54 9 11-5505-2228" }),
      );

      expect(result.ok).toBe(true);
      expect(mocks.siteSettingsUpsert).toHaveBeenCalledWith({
        where: { id: "default" },
        create: {
          id: "default",
          inquiryEmail: "consultas@alquileresanita.com.ar",
          whatsappPhone: "5491155052228",
          backupEmail: "",
          backupHour: 8,
        },
        update: {
          inquiryEmail: "consultas@alquileresanita.com.ar",
          whatsappPhone: "5491155052228",
          backupEmail: "",
          backupHour: 8,
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/contacto");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/propiedades/[slug]", "page");
    });

    it("rejects an invalid email with a Spanish field error", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ inquiryEmail: "not-an-email" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.inquiryEmail).toMatch(/email válido/i);
      expect(mocks.siteSettingsUpsert).not.toHaveBeenCalled();
    });

    it("rejects a WhatsApp without enough digits with a Spanish field error", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ whatsappPhone: "1234" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.whatsappPhone).toMatch(/entre 8 y 15 dígitos/i);
      expect(mocks.siteSettingsUpsert).not.toHaveBeenCalled();
    });

    it("rejects an invalid backupEmail with a Spanish field error", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ backupEmail: "not-an-email" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.backupEmail).toMatch(/email válido/i);
      expect(mocks.siteSettingsUpsert).not.toHaveBeenCalled();
    });

    it("saves an empty backupEmail as an empty string", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData(),
      );

      expect(result.ok).toBe(true);
      const upsertCall = mocks.siteSettingsUpsert.mock.calls[0][0];
      expect(upsertCall.create.backupEmail).toBe("");
      expect(upsertCall.update.backupEmail).toBe("");
    });

    it("saves a valid backupEmail in the upsert", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ backupEmail: "backup@otro.com" }),
      );

      expect(result.ok).toBe(true);
      const upsertCall = mocks.siteSettingsUpsert.mock.calls[0][0];
      expect(upsertCall.create.backupEmail).toBe("backup@otro.com");
      expect(upsertCall.update.backupEmail).toBe("backup@otro.com");
    });

    it("saves a valid backupHour in the upsert", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ backupHour: "15" }),
      );

      expect(result.ok).toBe(true);
      const upsertCall = mocks.siteSettingsUpsert.mock.calls[0][0];
      expect(upsertCall.create.backupHour).toBe(15);
      expect(upsertCall.update.backupHour).toBe(15);
    });

    it("defaults the backupHour to 8 when the field is an empty string", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ backupHour: "" }),
      );

      expect(result.ok).toBe(true);
      const upsertCall = mocks.siteSettingsUpsert.mock.calls[0][0];
      expect(upsertCall.create.backupHour).toBe(8);
      expect(upsertCall.update.backupHour).toBe(8);
    });

    it("rejects a backupHour above 23 with a Spanish field error", async () => {
      const result = await updateContactSettings(
        initialState,
        buildContactFormData({ backupHour: "24" }),
      );

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.backupHour).toBe(
        "La hora del backup debe estar entre 0 y 23.",
      );
      expect(mocks.siteSettingsUpsert).not.toHaveBeenCalled();
    });
  });
});

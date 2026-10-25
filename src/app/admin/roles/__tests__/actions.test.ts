import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  roleCreate: vi.fn(),
  roleUpdate: vi.fn(),
  roleFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: {
      create: mocks.roleCreate,
      update: mocks.roleUpdate,
      findUnique: mocks.roleFindUnique,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidatePath(path),
}));

import { createRole, updateRole } from "@/app/admin/roles/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const defaults: Record<string, string> = {
    name: "Contador",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(`tab-${item}`, "on");
      }
    } else {
      formData.append(key, value);
    }
  }
  return formData;
}

describe("role actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", isDefaultAdmin: true },
    });
    mocks.roleCreate.mockResolvedValue({});
    mocks.roleUpdate.mockResolvedValue({});
    mocks.roleFindUnique.mockResolvedValue({ id: "role-3" });
  });

  describe("authorization", () => {
    it("throws 'No autorizado' when the caller is not a default admin", async () => {
      mocks.auth.mockResolvedValue({
        user: { id: "user-2", email: "operative@alquileresanita.com.ar", isDefaultAdmin: false },
      });

      await expect(createRole(initialState, buildFormData())).rejects.toThrow("No autorizado");
      await expect(updateRole(initialState, buildFormData({ id: "role-3" }))).rejects.toThrow("No autorizado");
    });

    it("throws when there is no session", async () => {
      mocks.auth.mockResolvedValue(null);

      await expect(createRole(initialState, buildFormData())).rejects.toThrow("No autorizado");
    });
  });

  describe("createRole", () => {
    it("rejects an empty role name", async () => {
      const result = await createRole(initialState, buildFormData({ name: "   " }));

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toMatch(/nombre/i);
      expect(mocks.roleCreate).not.toHaveBeenCalled();
    });

    it("creates a role with selected allowed tabs", async () => {
      const result = await createRole(
        initialState,
        buildFormData({ "tab-calendario": "on", "tab-gastos": "on" } as Record<string, string>),
      );

      expect(result.ok).toBe(true);
      expect(mocks.roleCreate).toHaveBeenCalledWith({
        data: {
          name: "Contador",
          allowedTabs: ["calendario", "gastos"],
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/roles");
    });

    it("creates a role with no allowed tabs when none are checked", async () => {
      const result = await createRole(initialState, buildFormData());

      expect(result.ok).toBe(true);
      expect(mocks.roleCreate).toHaveBeenCalledWith({
        data: {
          name: "Contador",
          allowedTabs: [],
        },
      });
    });

    // Regression: role tabs come from the canonical admin-tabs registry, so
    // newly added tabs (feriados, carga-gastos) must persist instead of being
    // silently dropped by a stale local list.
    it("persists newly added tabs (feriados, carga-gastos)", async () => {
      const result = await createRole(
        initialState,
        buildFormData({ "tab-feriados": "on", "tab-carga-gastos": "on" } as Record<string, string>),
      );

      expect(result.ok).toBe(true);
      expect(mocks.roleCreate).toHaveBeenCalledWith({
        data: {
          name: "Contador",
          allowedTabs: ["carga-gastos", "feriados"],
        },
      });
    });

    it("maps P2002 name conflicts to a Spanish field error", async () => {
      mocks.roleCreate.mockRejectedValue({ code: "P2002" });

      const result = await createRole(initialState, buildFormData());

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toBe("Ya existe un rol con ese nombre.");
    });

    it("rethrows non-conflict database errors", async () => {
      mocks.roleCreate.mockRejectedValue(new Error("connection refused"));

      await expect(createRole(initialState, buildFormData())).rejects.toThrow("connection refused");
    });
  });

  describe("updateRole", () => {
    it("returns a not-found message for an unknown id", async () => {
      mocks.roleFindUnique.mockResolvedValue(null);

      const result = await updateRole(initialState, buildFormData({ id: "desconocido" }));

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no encontrado/i);
      expect(mocks.roleUpdate).not.toHaveBeenCalled();
    });

    it("updates an existing role name and allowed tabs", async () => {
      const result = await updateRole(
        initialState,
        buildFormData({ id: "role-3", name: "Contador senior", "tab-panel": "on" } as Record<string, string>),
      );

      expect(result.ok).toBe(true);
      expect(mocks.roleUpdate).toHaveBeenCalledWith({
        where: { id: "role-3" },
        data: {
          name: "Contador senior",
          allowedTabs: ["panel"],
        },
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/roles");
    });

    it("maps P2002 name conflicts to a Spanish field error on update", async () => {
      mocks.roleUpdate.mockRejectedValue({ code: "P2002" });

      const result = await updateRole(initialState, buildFormData({ id: "role-3" }));

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.name).toBe("Ya existe un rol con ese nombre.");
    });

    it("rethrows non-conflict database errors on update", async () => {
      mocks.roleUpdate.mockRejectedValue(new Error("connection refused"));

      await expect(updateRole(initialState, buildFormData({ id: "role-3" }))).rejects.toThrow("connection refused");
    });
  });
});

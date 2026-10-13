import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (plain: string, hashed: string) => mocks.bcryptCompare(plain, hashed),
    hash: (password: string, rounds: number) => mocks.bcryptHash(password, rounds),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

import { changePassword } from "@/app/auth/change-password/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const defaults: Record<string, string> = {
    currentPassword: "anita1234",
    newPassword: "newSecurePassword123",
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    formData.append(key, value);
  }
  return formData;
}

describe("changePassword action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "user@alquileresanita.com.ar", mustChangePassword: true },
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed-password",
    });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.bcryptHash.mockResolvedValue("new-hashed-password");
    mocks.userUpdate.mockResolvedValue({});
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(changePassword(initialState, buildFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/auth/signin",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an empty current password", async () => {
    const result = await changePassword(
      initialState,
      buildFormData({ currentPassword: "" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.currentPassword).toMatch(/actual/i);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a new password shorter than 6 characters", async () => {
    const result = await changePassword(
      initialState,
      buildFormData({ newPassword: "12345" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.newPassword).toMatch(/6 caracteres/i);
  });

  it("rejects a new password equal to the current password", async () => {
    const result = await changePassword(
      initialState,
      buildFormData({ currentPassword: "samepassword", newPassword: "samepassword" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.newPassword).toMatch(/distinta/i);
  });

  it("rejects an incorrect current password", async () => {
    mocks.bcryptCompare.mockResolvedValue(false);

    const result = await changePassword(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.currentPassword).toMatch(/incorrecta/i);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("rejects when the user cannot be found", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const result = await changePassword(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Volvé a iniciar sesión/i);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("updates the password hash, clears mustChangePassword, and redirects to /admin", async () => {
    await expect(changePassword(initialState, buildFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/admin",
    );

    expect(mocks.bcryptCompare).toHaveBeenCalledWith("anita1234", "hashed-password");
    expect(mocks.bcryptHash).toHaveBeenCalledWith("newSecurePassword123", 10);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "new-hashed-password",
        mustChangePassword: false,
      },
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });
});
